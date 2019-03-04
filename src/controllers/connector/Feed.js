const AbstractFeed = require('./AbstractFeed');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');

class Feed extends AbstractFeed {
    async getFeed(params) {
        const { fullQuery, currentUserId, type, sortBy, sequenceKey } = await this._prepareQuery(
            params
        );

        let modelObjects;

        if (this._isCachedQueryType(type, sortBy)) {
            modelObjects = this._getModelObjectsFromCache(fullQuery, sequenceKey);
        } else {
            modelObjects = await PostModel.find(...Object.values(fullQuery));
        }

        if (!modelObjects || modelObjects.length === 0) {
            return this._makeEmptyFeedResult();
        }

        await this._populate(modelObjects, currentUserId);

        return this._makeFeedResult(modelObjects, sortBy);
    }

    async _prepareQuery(params) {
        const {
            type,
            sortBy,
            timeframe,
            sequenceKey,
            limit,
            currentUserId,
            requestedUserId,
            communityId,
        } = this._normalizeParams(params);

        const query = {};
        const projection = {
            'content.body.full': false,
        };
        const options = { lean: true };
        const fullQuery = { query, projection, options };

        this._applySortingAndSequence(fullQuery, { type, sortBy, timeframe, sequenceKey, limit });
        await this._applyFeedTypeConditions(fullQuery, {
            type,
            requestedUserId,
            communityId,
        });

        return { fullQuery, currentUserId, type, sortBy, sequenceKey };
    }

    _applySortingAndSequence(
        { query, projection, options },
        { type, sortBy, timeframe, sequenceKey, limit }
    ) {
        super._applySortingAndSequence(
            { query, projection, options },
            { type, sortBy, sequenceKey, limit }
        );
    }

    _applySortByTime({ query, options, sequenceKey, direction }) {
        super._applySortByTime({ query, options, sequenceKey, direction });

        options.sort = { _id: direction };
    }

    async _populate(modelObjects, currentUserId) {
        await this._tryApplyVotesForModels({ Model: PostModel, modelObjects, currentUserId });
        await this._populateAuthors(modelObjects);
        await this._populateCommunities(modelObjects);
    }

    _normalizeParams({
        type = 'community',
        currentUserId = null,
        requestedUserId = null,
        communityId = null,
        ...params
    }) {
        params = super._normalizeParams(params);

        type = String(type);

        if (currentUserId) {
            currentUserId = String(currentUserId);
        }

        if (requestedUserId) {
            requestedUserId = String(requestedUserId);
        }

        if (communityId) {
            communityId = String(communityId);
        }

        return { type, currentUserId, requestedUserId, communityId, ...params };
    }

    async _applyFeedTypeConditions({ query }, { type, requestedUserId, communityId }) {
        switch (type) {
            case 'subscriptions':
                await this._applyUserSubscriptions(query, requestedUserId);
                break;

            case 'byUser':
                query['contentId.userId'] = requestedUserId;
                break;

            case 'community':
            default:
                query.communityId = communityId;
        }
    }

    async _applyUserSubscriptions(query, requestedUserId) {
        const model = await ProfileModel.findOne(
            { userId: requestedUserId },
            { subscriptions: true, _id: false }
        );

        if (!model) {
            throw { code: 400, message: 'Bad user id' };
        }

        query['communityId'] = { $in: model.subscriptions.communityIds };
    }

    _isCachedQueryType(type, sortBy) {
        return type === 'community' && sortBy === 'popular';
    }

    _getModelObjectsFromCache({ query, projection, options }, sequenceKey) {
        // TODO -
    }
}

module.exports = Feed;
