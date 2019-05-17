const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');

class Post extends AbstractContent {
    async getPost({
        currentUserId,
        requestedUserId,
        permlink,
        contentType,
        username,
        app,
    }) {
        const modelObject = await this._getContent(PostModel, {
            currentUserId,
            requestedUserId,
            permlink,
            contentType,
            username,
            app,
        });

        await Promise.all([
            this._populateCommunities([modelObject]),
            this._populateViewCount([modelObject]),
        ]);

        return modelObject;
    }

    async getPostVotes({ requestedUserId, permlink }) {
        // TODO -
    }
}

module.exports = Post;
