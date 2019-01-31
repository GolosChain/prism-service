const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');

class Feed extends BasicController {
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
        const options = {};
        const fullQuery = { query, options };
        const projection = { 'content.body.full': false, _id: false, versionKey: false };

        this._applySortingAndSequence(fullQuery, { nextFrom, nextAfter, sortBy, limit });
        await this._applyFeedTypeConditions(fullQuery, { type, userId, communityId });

        const models = await PostModel.find(query, projection, options);

        this._applyVoteMarkers(models, userId);

        return models;
    }

    _normalizeParams({
        type = 'community',
        sortBy = 'time',
        nextFrom = null,
        nextAfter = null,
        limit = 10,
        userId = null,
        communityId = null,
    }) {
        type = String(type);
        sortBy = String(sortBy);
        limit = Number(limit);

        if (userId) {
            userId = String(userId);
        }

        if (communityId) {
            communityId = String(communityId);
        }

        if (limit > env.GLS_MAX_FEED_LIMIT) {
            limit = env.GLS_MAX_FEED_LIMIT;
        }

        return { type, sortBy, nextFrom, nextAfter, limit, userId, communityId };
    }

    _applySortingAndSequence({ query, options }, { nextFrom, nextAfter, sortBy, limit }) {
        options.limit = limit;
        options.lean = true;

        switch (sortBy) {
            case 'byTime':
            default:
                this._applySortByTime(query, nextFrom, nextAfter);
        }

        return { query, options };
    }

    _applySortByTime(query, nextFrom, nextAfter) {
        if (nextFrom) {
            nextFrom = Number(nextFrom);

            if (isNaN(nextFrom) || !isFinite(nextFrom)) {
                this._throwBadSequence();
            }

            query.meta = {};
            query.meta.time = { $gt: nextFrom - 1 };
        } else if (nextAfter) {
            nextAfter = Number(nextAfter);

            if (isNaN(nextFrom) || !isFinite(nextFrom)) {
                this._throwBadSequence();
            }

            query.meta = {};
            query.meta.time = { $gt: nextAfter };
        }
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
            { 'community.subscriptionsList': true, _id: false, versionKey: false }
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

    _throwBadSequence() {
        throw { code: 400, message: 'Bad sequence params' };
    }

    _throwBadUserId() {
        throw { code: 400, message: 'Bad user id' };
    }
}

module.exports = Feed;
