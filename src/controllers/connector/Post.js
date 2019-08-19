const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');

class Post extends AbstractContent {
    async getPost({ currentUserId, requestedUserId, permlink, contentType, username, user, app }) {
        const modelObject = await this._getContent(PostModel, {
            currentUserId,
            requestedUserId,
            permlink,
            contentType,
            username,
            user,
            app,
            noReposts: true,
        });

        await Promise.all([
            this._populateCommunities([modelObject]),
            this._populateViewCount([modelObject]),
        ]);

        return modelObject;
    }
}

module.exports = Post;
