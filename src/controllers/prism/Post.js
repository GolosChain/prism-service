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

// TODO Add revert
class Post extends Abstract {
    async handleCreation({ args: content }, blockNum) {
        if (!this._isPost(content)) {
            return;
        }

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
                    full: content.bodymssg,
                    preview: this._makeContentPreview(content.bodymssg),
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

    _isPost(content) {
        return !content.parentacc;
    }

    _makeContentPreview(content) {
        return content.slice(0, env.GLS_CONTENT_PREVIEW_LENGTH);
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
