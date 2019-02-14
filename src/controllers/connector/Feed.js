const AbstractFeed = require('./AbstractFeed');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');

class Feed extends AbstractFeed {
    async getFeed(params) {
        const { type, sortBy, sequenceKey, limit, userId, communityId } = this._normalizeParams(
            params
        );

        const query = {};
        const options = { lean: true };
        const fullQuery = { query, options };
        const projection = {
            'content.body.full': false,
            __v: false,
            createdAt: false,
            updatedAt: false,
        };

        this._applySortingAndSequence(fullQuery, { sortBy, sequenceKey, limit });
        await this._applyFeedTypeConditions(fullQuery, { type, userId, communityId });

        let models = await PostModel.find(query, projection, options);

        models = models || [];

        if (userId) {
            this._applyVoteMarkers(models, userId);
        }

        return this._makeFeedResult(models, sortBy);
    }

    _normalizeParams({ type = 'community', userId = null, communityId = null, ...params }) {
        params = super._normalizeParams(params);

        type = String(type);

        if (userId) {
            userId = String(userId);
        }

        if (communityId) {
            communityId = String(communityId);
        }

        return { type, userId, communityId, ...params };
    }

    async _applyFeedTypeConditions({ query, options }, { type, userId, communityId }) {
        switch (type) {
            case 'subscriptions':
                await this._applyUserSubscriptions(query, userId);
                break;

            case 'byUser':
                query['user.id'] = userId;
                break;

            case 'community':
            default:
                query['community.id'] = communityId;
        }
    }

    async _applyUserSubscriptions(query, userId) {
        const model = await ProfileModel.findOne(
            { id: userId },
            { 'community.subscriptionsList': true, _id: false, __v: false }
        );

        if (!model) {
            this._throwBadUserId();
        }

        query['community.id'] = { $in: [] };

        for (const { id } of model.community.subscriptionsList) {
            query['community.id'].$in.push(id);
        }
    }

    _throwBadUserId() {
        throw { code: 400, message: 'Bad user id' };
    }
}

module.exports = Feed;
