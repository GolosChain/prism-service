const urlValidator = require('valid-url');
const uuid = require('uuid');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');
const env = require('../../data/env');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const ProfileModel = require('../../models/Profile');

class AbstractContent extends Abstract {
    async handlePayout({ from, to, quantity, memo }) {
        if (!this._isPayoutContract(from)) {
            return;
        }

        const payoutType = this._getPayoutType(to);
        if (!payoutType) {
            return;
        }

        const { userId, permlink, contentType, rewardType } = this._parsePayoutMemo(
            memo,
            payoutType
        );

        const Model = this._getPayoutModelClass(contentType);
        if (!Model) {
            return;
        }

        const rewardTypeKey = this._getRewardTypeKey(rewardType);
        if (!rewardTypeKey) {
            return;
        }

        const { tokenName, tokenValue } = this._extractTokenInfo(quantity);
        if (!tokenName) {
            return;
        }

        await this._setPayout(
            { userId, permlink },
            { rewardTypeKey, payoutType, tokenName, tokenValue }
        );
    }

    async updateUserPostsCount(userId, increment) {
        await ProfileModel.updateOne({ userId }, { $inc: { 'stats.postsCount': increment } });
    }

    extractContentObjectFromGenesis(genesisContent) {
        return {
            title: this._extractTitle(genesisContent),
            body: {
                preview: this._extractBodyPreview(genesisContent),
                full: this._extractBodyFull(genesisContent),
                mobile: this._extractBodyMobile(genesisContent),
                raw: this._extractBodyRaw(genesisContent),
            },
            metadata: {},
            embeds: [],
        };
    }

    _extractTitle(content) {
        if (content.headermssg) {
            return this._contentUtil.sanitize(content.headermssg);
        } else {
            return this._contentUtil.sanitize(content.title);
        }
    }

    _extractBodyRaw(content) {
        if (content.bodymssg) {
            return content.bodymssg;
        } else {
            return content.body;
        }
    }

    _extractBodyFull(content) {
        const raw = this._extractBodyRaw(content);

        return this._contentUtil.sanitize(raw);
    }

    _extractBodyPreview(content) {
        const raw = this._extractBodyRaw(content);

        return this._contentUtil.sanitizePreview(raw, env.GLS_CONTENT_PREVIEW_LENGTH);
    }

    _extractBodyMobile(content) {
        const raw = this._extractBodyRaw(content);
        const original = this._contentUtil.sanitizeMobile(raw);
        const result = [];
        let part = original;

        while (part) {
            part = this._extractNextMobileContentFor(part, result);
        }

        return result;
    }

    _extractNextMobileContentFor(part, result) {
        const imgPosition = this._getImageStartPosition(part);

        if (imgPosition === -1) {
            this._addMobileText(part, result);
            return;
        }

        this._addMobileText(part.slice(0, imgPosition), result);

        part = part.slice(imgPosition);

        const imgEndPosition = part.search('>');

        if (imgEndPosition === -1) {
            return;
        }

        const srcMatch = this._matchImageSrc(part, imgEndPosition);

        if (srcMatch) {
            this._addMobileImage(srcMatch[1], result);
        }

        return part.slice(imgEndPosition + 1);
    }

    _addMobileText(content, result) {
        result.push({
            type: 'text',
            content,
        });
    }

    _addMobileImage(src, result) {
        result.push({
            type: 'image',
            src,
        });
    }

    _getImageStartPosition(text) {
        return text.search(/<\s*?img/i);
    }

    _matchImageSrc(text, imgEndPosition) {
        const img = text.slice(0, imgEndPosition + 1);

        return img.match(/src.*?=.*?"(.*?)"/i);
    }

    async _extractMetadata(content) {
        const raw = content.jsonmetadata;

        if (raw === '') {
            return {};
        }

        try {
            const metadata = JSON.parse(raw);

            if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
                throw 'Invalid';
            }

            await this._applyEmbeds(metadata);

            return metadata;
        } catch (error) {
            Logger.log('Invalid content metadata.');
            return {};
        }
    }

    async _applyEmbeds(metadata) {
        if (!Array.isArray(metadata.embeds)) {
            return;
        }

        for (const item of metadata.embeds) {
            if (!urlValidator.isUri(item.url)) {
                continue;
            }

            await this._applyEmbedFor(item);
        }
    }

    async _applyEmbedFor(item) {
        const embedType = 'oembed';
        const embedData = await this.callService('facade', 'frame.getEmbed', {
            auth: {},
            params: {
                type: embedType,
                url: item.url,
            },
        });

        delete item.url;

        item.id = uuid.v4();
        item.type = embedType;
        item.result = embedData;
    }

    _extractContentId(content) {
        return this._extractContentIdFromId(content.message_id);
    }

    _extractContentIdFromId(id) {
        return {
            userId: id.author,
            permlink: id.permlink,
        };
    }

    async _isPost(content) {
        const id = content.parent_id;

        if (id) {
            return !id.author;
        }

        const postCount = await PostModel.countDocuments({
            contentId: this._extractContentId(content),
        });

        return Boolean(postCount);
    }

    async _isComment(content) {
        const id = content.parent_id;

        if (id) {
            return Boolean(id.author);
        }

        const postCount = await CommentModel.countDocuments({
            contentId: this._extractContentId(content),
        });

        return Boolean(postCount);
    }

    async _extractContentObject(rawContent) {
        const metadata = await this._extractMetadata(rawContent);
        const embeds = metadata.embeds || [];

        delete metadata.embeds;

        return {
            title: this._extractTitle(rawContent),
            body: {
                preview: this._extractBodyPreview(rawContent),
                full: this._extractBodyFull(rawContent),
                mobile: this._extractBodyMobile(rawContent),
                raw: this._extractBodyRaw(rawContent),
            },
            metadata,
            embeds,
        };
    }

    _isPayoutContract(name) {
        return name.split('.')[1] === 'publish';
    }

    _parsePayoutMemo(memo, payoutType) {
        if (payoutType === 'vesting') {
            const match = memo.match(/^\w+ \w+: (.+); (\w+) \w+ \w+ (\w+) .+:(.+)$/);

            return {
                userId: match[1],
                permlink: match[4],
                rewardType: match[2],
                contentType: match[3],
            };
        } else {
            const match = memo.match(/^\w+ \w+ (\w+) (.+):(.+)/);

            return {
                userId: match[2],
                permlink: match[3],
                rewardType: 'author',
                contentType: match[1],
            };
        }
    }

    _getRewardTypeKey(rewardType) {
        switch (rewardType) {
            case 'author':
                return 'author';

            case 'curator':
                return 'curator';

            case 'benefeciary':
                return 'benefactor';

            default:
                Logger.warn(`Payout - unknown reward type - ${rewardType}`);
                return null;
        }
    }

    _getPayoutModelClass(contentType) {
        switch (contentType) {
            case 'post':
                return PostModel;

            case 'comment':
                return CommentModel;

            default:
                Logger.warn(`Payout - unknown content type - ${contentType}`);
                return null;
        }
    }

    _getPayoutType(target) {
        if (target.split('.')[1] === 'vesting') {
            return 'vesting';
        } else {
            return 'token';
        }
    }

    _extractTokenInfo(quantity) {
        let [tokenValue, tokenName] = quantity.split(' ');

        tokenValue = Number(tokenValue);

        if (!tokenName || Number.isNaN(tokenValue)) {
            Logger.warn(`Payout - invalid quantity - ${quantity}`);
            return { tokenName: null, tokenValue: null };
        }

        return { tokenName, tokenValue };
    }

    async _setPayout(contentId, { rewardTypeKey, payoutType, tokenName, tokenValue }) {
        await PostModel.updateOne(
            { contentId },
            {
                $set: {
                    'payout.done': true,
                    [`payout.${rewardTypeKey}.${payoutType}`]: {
                        name: tokenName,
                        value: tokenValue,
                    },
                },
            }
        );
    }

    _extractBenefactorPercents(content) {
        const percents = content.beneficiaries || [];

        return percents.map(value => value.weight);
    }
}

module.exports = AbstractContent;
