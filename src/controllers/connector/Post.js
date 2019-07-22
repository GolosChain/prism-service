const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');

class Post extends AbstractContent {
    async getPost({ currentUserId, requestedUserId, permlink, contentType, username, app }) {
        const modelObject = await this._getContent(PostModel, {
            currentUserId,
            requestedUserId,
            permlink,
            contentType,
            username,
            app,
            noReposts: true,
        });

        await Promise.all([
            this._populateCommunities([modelObject]),
            this._populateViewCount([modelObject]),
        ]);

        return modelObject;
    }

    async getHeaders({ contentIds }) {
        const promises = [];

        for (const contentId of contentIds) {
            promises.push(
                PostModel.findOne(
                    {
                        'contentId.userId': contentId.userId,
                        'contentId.permlink': contentId.permlink,
                    },
                    {
                        _id: false,
                        'content.title': true,
                    },
                    {
                        lean: true,
                    }
                )
            );
        }

        const result = await Promise.all(promises);

        return result.map(value => {
            if (value) {
                return value.content.title;
            } else {
                return null;
            }
        });
    }
}

module.exports = Post;
