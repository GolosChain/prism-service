const core = require('gls-core-service');
const Content = core.utils.Content;
const env = require('../../data/env');
const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');

class Tag extends AbstractContent {
    constructor(...args) {
        super(...args);

        this._contentUtil = new Content({ maxHashTagSize: env.GLS_MAX_HASH_TAG_SIZE });
    }

    async handleCreate({ args: content }, { communityId }) {
        if (!(await this._isPost(content))) {
            return;
        }

        // TODO -
    }

    async handleUpdate({ args: content }, { communityId }) {
        if (!(await this._isPost(content))) {
            return;
        }

        // TODO -
    }

    async handleDelete({ args: content }, { communityId }) {
        if (!(await this._isPost(content))) {
            return;
        }

        // TODO -
    }
}

module.exports = Tag;
