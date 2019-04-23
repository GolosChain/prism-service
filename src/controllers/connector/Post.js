const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');

class Post extends AbstractContent {
    async getPost({ currentUserId, requestedUserId, permlink, refBlockNum, contentType }) {
        const modelObject = await this._getContent(PostModel, {
            currentUserId,
            requestedUserId,
            permlink,
            refBlockNum,
            contentType,
        });

        await this._populateCommunities([modelObject]);

        return modelObject;
    }
}

module.exports = Post;
