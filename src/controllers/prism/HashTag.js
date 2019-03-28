const core = require('gls-core-service');
const Content = core.utils.Content;
const env = require('../../data/env');
const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');
const HashTagModel = require('../../models/HashTag');

class HashTag extends AbstractContent {
    constructor(...args) {
        super(...args);

        this._contentUtil = new Content({ maxHashTagSize: env.GLS_MAX_HASH_TAG_SIZE });
    }

    async handleCreate({ args: content }, { communityId }) {
        if (!(await this._isPost(content))) {
            return;
        }

        const tags = this._extractTags(content);

        // TODO -
    }

    async handleUpdate({ args: content }, { communityId }) {
        if (!(await this._isPost(content))) {
            return;
        }

        const tags = this._extractTags(content);

        // TODO -
    }

    async handleDelete({ args: content }, { communityId }) {
        if (!(await this._isPost(content))) {
            return;
        }

        const tags = this._extractTags(content);

        // TODO -
    }

    _extractTags(content) {
        const tagsFromMetadata = this._extractTagsFromMetadata(content);
        const tagsFromText = this._extractTagsFromText(content);

        return [...new Set([...tagsFromMetadata, ...tagsFromText])];
    }

    _extractTagsFromMetadata(content) {
        const metadata = this._extractMetadata(content);

        return Array.from(metadata.tags || []);
    }

    _extractTagsFromText(content) {
        const text = this._extractBodyRaw(content);

        return this._contentUtil.extractHashTags(text);
    }
}

module.exports = HashTag;
