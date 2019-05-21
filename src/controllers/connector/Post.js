const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');

class Post extends AbstractContent {
    async getPost({
        currentUserId,
        requestedUserId,
        permlink,
        refBlockNum,
        contentType,
        username,
        app,
    }) {
        const modelObject = await this._getContent(PostModel, {
            currentUserId,
            requestedUserId,
            permlink,
            refBlockNum,
            contentType,
            username,
            app,
        });

        await this._populateCommunities([modelObject]);

        return modelObject;
    }

    async getPostVotes({ requestedUserId, permlink, refBlockNum }) {
        // TODO -
    }
}

module.exports = Post;
