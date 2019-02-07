const AbstractFeed = require('./AbstractFeed');
const CommentModel = require('../../models/Comment');

class Comment extends AbstractFeed {
    async getComments(params) {
        const { sortBy, nextFrom, nextAfter, limit, userId, communityId } = this._normalizeParams(
            params
        );

        const query = { communityId };
        const options = { lean: true };
        const fullQuery = { query, options };
        const projection = { _id: false, __v: false, createdAt: false, updatedAt: false };

        this._applySortingAndSequence(fullQuery, { nextFrom, nextAfter, sortBy, limit });

        const models = await CommentModel.find(query, projection, options);

        if (userId) {
            this._applyVoteMarkers(models, userId);
        }

        return models;
    }

    _normalizeParams({ userId = null, communityId, ...params }) {
        params = super._normalizeParams(params);

        communityId = String(communityId);

        if (userId) {
            userId = String(userId);
        }

        return { userId, communityId, ...params };
    }
}

module.exports = Comment;
