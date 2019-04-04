const urlValidator = require('valid-url');
const uuid = require('uuid');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');
const env = require('../../data/env');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');

class AbstractContent extends Abstract {
    _extractTitle(content) {
        return this._contentUtil.sanitize(content.headermssg);
    }

    _extractBodyRaw(content) {
        return content.bodymssg;
    }

    _extractBodyFull(content) {
        const raw = this._extractBodyRaw(content);

        return this._contentUtil.sanitize(raw);
    }

    _extractBodyPreview(content) {
        const raw = this._extractBodyRaw(content);

        return this._contentUtil.sanitizePreview(raw, env.GLS_CONTENT_PREVIEW_LENGTH);
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
            refBlockNum: id.ref_block_num,
        };
    }

    _isContentIdEquals(left, right) {
        return (
            left.userId === right.userId &&
            left.permlink === right.permlink &&
            left.refBlockNum === right.refBlockNum
        );
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
                raw: this._extractBodyRaw(rawContent),
            },
            metadata,
            embeds,
        };
    }
}

module.exports = AbstractContent;
