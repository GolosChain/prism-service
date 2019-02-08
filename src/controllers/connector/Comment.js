const AbstractFeed = require('./AbstractFeed');
const CommentModel = require('../../models/Comment');

class Comment extends AbstractFeed {
    async getComments(params) {
        const { sortBy, nextFrom, nextAfter, limit, userId, postId, type } = this._normalizeParams(
            params
        );

        const query = {};
        const options = { lean: true };
        const fullQuery = { query, options };
        const projection = { _id: false, __v: false, createdAt: false, updatedAt: false };

        this._applySortingAndSequence(fullQuery, { nextFrom, nextAfter, sortBy, limit });
        this._applyFeedTypeConditions(fullQuery, { type, userId, postId });

        const models = await CommentModel.find(query, projection, options);

        if (userId) {
            this._applyVoteMarkers(models, userId);
        }

        return { data: models };
    }

    _normalizeParams({ type = 'post', userId = null, postId, ...params }) {
        params = super._normalizeParams(params);

        type = String(type);
        postId = String(postId);

        if (userId) {
            userId = String(userId);
        }

        return { type, userId, postId, ...params };
    }

    _applyFeedTypeConditions({ query }, { type, userId, postId }) {
        switch (type) {
            case 'user':
                query['user.id'] = userId;
                break;

            case 'post':
            default:
                query['post.id'] = postId;
                break;
        }
    }
}

module.exports = Comment;
