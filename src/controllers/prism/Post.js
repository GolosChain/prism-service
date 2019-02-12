const core = require('gls-core-service');
const Content = core.utils.Content;
const env = require('../../data/env');
const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');

// TODO Remove after MVP
const HARDCODE_COMMUNITY_ID = 'GOLOSID';
const HARDCODE_COMMUNITY_NAME = 'GOLOSNAME';
const HARDCODE_COMMUNITY_AVATAR_URL = 'none';

// TODO REMOVE AFTER USER CREATION LOGIC
const TMP_USER_ID_PREFIX = 'GOLOS_TMP_ID';

class Post extends Abstract {
    constructor(...args) {
        super(...args);

        this._contentUtil = new Content();
    }

    async handleCreate({ args: content }, blockNum) {
        if (!this._isPost(content)) {
            return;
        }

        const bodyFull = this._contentUtil.sanitize(content.bodymssg);
        const bodyPreview = this._contentUtil.sanitizePreview(
            content.bodymssg,
            env.GLS_CONTENT_PREVIEW_LENGTH
        );
        const userId = await this._getUserId(content);
        const model = new PostModel({
            id: await this._makeId(content, blockNum),
            user: {
                id: userId,
                name: content.account,
            },
            community: {
                id: HARDCODE_COMMUNITY_ID,
                name: HARDCODE_COMMUNITY_NAME,
                avatarUrl: HARDCODE_COMMUNITY_AVATAR_URL,
            },
            content: {
                title: content.headermssg,
                body: {
                    full: bodyFull,
                    preview: bodyPreview,
                },
            },
            meta: {
                // TODO Change after blockchain implement block time
                time: new Date(),
            },
        });

        await model.save();
        await this._updateUserPostCount(userId, 1);
    }

    async handleUpdate({ args: content }, blockMeta) {
        if (!this._isPost(content)) {
            return;
        }

        const model = await PostModel.findOne({}); // TODO -

        if (!model) {
            // Can be valid in blockchain as transaction,
            // but invalid as logic (post not found in blockchain)
            return;
        }

        // TODO -
    }

    async handleDelete({ args: content }, blockMeta) {
        if (!this._isPost(content)) {
            return;
        }

        const model = await PostModel.findOne({}); // TODO -

        if (!model) {
            // Can be valid in blockchain as transaction,
            // but invalid as logic (post not found in blockchain)
            return;
        }

        // TODO -
    }

    _isPost(content) {
        return !Boolean(content.parentacc);
    }

    async _makeId(content, blockNum) {
        return [blockNum, HARDCODE_COMMUNITY_ID, content.account, content.permlink].join(':');
    }

    async _getUserId(content) {
        return TMP_USER_ID_PREFIX + content.account;
    }

    async _updateUserPostCount(userId, increment) {
        await ProfileModel.updateOne({ id: userId }, { $inc: { 'content.postsCount': increment } });
    }
}

module.exports = Post;
