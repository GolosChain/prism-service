const AbstractFeed = require('./AbstractFeed');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');

class Feed extends AbstractFeed {
    async getFeed(params) {
        const {
            type,
            sortBy,
            nextFrom,
            nextAfter,
            limit,
            userId,
            communityId,
        } = this._normalizeParams(params);

        const query = {};
        const options = { lean: true };
        const fullQuery = { query, options };
        const projection = {
            'content.body.full': false,
            _id: false,
            __v: false,
            createdAt: false,
            updatedAt: false,
        };

        this._applySortingAndSequence(fullQuery, { nextFrom, nextAfter, sortBy, limit });
        await this._applyFeedTypeConditions(fullQuery, { type, userId, communityId });

        const models = await PostModel.find(query, projection, options);

        if (userId) {
            this._applyVoteMarkers(models, userId);
        }

        return models;
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

    _applyVoteMarkers(models, userId) {
        for (const model of models) {
            const votes = model.votes;

            if (userId) {
                votes.upByUser = votes.upUserList.includes(userId);
                votes.downByUser = votes.downUserList.includes(userId);
            } else {
                votes.upByUser = false;
                votes.downByUser = false;
            }

            delete votes.upUserList;
            delete votes.downUserList;
        }
    }

    _throwBadUserId() {
        throw { code: 400, message: 'Bad user id' };
    }
}

module.exports = Feed;
