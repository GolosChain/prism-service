const urlValidator = require('valid-url');
const uuid = require('uuid');
const core = require('cyberway-core-service');
const Logger = core.utils.Logger;
const BigNum = core.types.BigNum;
const Abstract = require('./Abstract');
const env = require('../../data/env');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const ProfileModel = require('../../models/Profile');
const Payouts = require('../../utils/Payouts');

class AbstractContent extends Abstract {
    async handlePayout(content, { events }) {
        const model = await this._getModel(content);

        if (!model) {
            return;
        }

        const event = events.find(event => event.event === 'postreward');

        if (!event) {
            return;
        }

        const rewardTypes = [
            'author_reward',
            'curator_reward',
            'benefactor_reward',
            'unclaimed_reward',
        ];

        const payouts = {};

        for (const rewardType of rewardTypes) {
            const rewardTypeKey = Payouts.getRewardTypeKey(rewardType);

            if (!rewardTypeKey) {
                continue;
            }

            const { tokenName, tokenValue } = Payouts.extractTokenInfo(event.args[rewardType]);

            if (!tokenName) {
                continue;
            }

            payouts[`payout.${rewardTypeKey}.token`] = {
                name: tokenName,
                value: tokenValue,
            };
        }

        await this._setPayouts(model, payouts);
    }

    async updateUserPostsCount(userId, increment) {
        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId },
            { $inc: { 'stats.postsCount': increment } }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: ProfileModel,
                documentId: previousModel._id,
                data: { $inc: { 'stats.postsCount': -increment } },
            });
        }
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

    async _getModel(content, projection = {}) {
        const contentId = this._extractContentId(content);
        const query = {
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
        };

        const post = await PostModel.findOne(query, projection);

        if (post) {
            return post;
        }

        const comment = await CommentModel.findOne(query, projection);

        if (comment) {
            return comment;
        }

        return null;
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

        const contentId = this._extractContentId(content);
        const postCount = await PostModel.countDocuments({
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
        });

        return Boolean(postCount);
    }

    async _isComment(content) {
        const id = content.parent_id;

        if (id) {
            return Boolean(id.author);
        }

        const contentId = this._extractContentId(content);
        const commentsCount = await CommentModel.countDocuments({
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
        });

        return Boolean(commentsCount);
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

    async _setPayouts(model, payouts) {
        const Model = model.constructor;
        const previousModel = await Model.findOneAndUpdate(
            {
                'contentId.userId': model.contentId.userId,
                'contentId.permlink': model.contentId.permlink,
            },
            {
                $set: {
                    'payout.done': true,
                    ...payouts,
                },
            }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model,
                documentId: previousModel._id,
                data: {
                    $set: {
                        ...previousModel.toObject(),
                    },
                },
            });
        }
    }

    _extractBenefactorPercents(content) {
        const percents = content.beneficiaries || [];

        return percents.map(value => new BigNum(value.weight));
    }
}

module.exports = AbstractContent;
