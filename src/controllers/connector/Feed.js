const AbstractFeed = require('./AbstractFeed');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');

class Feed extends AbstractFeed {
    constructor({ postFeedCache }) {
        super();

        this._postFeedCache = postFeedCache;
    }

    async getFeed(params) {
        // TODO username, app

        const { fullQuery, currentUserId, sortBy, meta, limit } = await this._prepareQuery(params);
        let modelObjects = await PostModel.find(...Object.values(fullQuery));

        if (!modelObjects || modelObjects.length === 0) {
            return this._makeEmptyFeedResult();
        }

        modelObjects = this._finalizeSorting(modelObjects, sortBy, fullQuery);
        await this._populate(modelObjects, currentUserId);

        return this._makeFeedResult(modelObjects, { sortBy, limit }, meta);
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
            tags,
            contentType,
        } = this._normalizeParams(params);

        const query = {};
        const projection = {
            'content.body.full': false,
            'content.body.mobile': false,
        };
        const options = { lean: true };
        const fullQuery = { query, projection, options };
        const meta = {};

        await this._applyFeedTypeConditions(fullQuery, {
            type,
            requestedUserId,
            communityId,
            tags,
        });
        this._applySortingAndSequence(
            fullQuery,
            { type, sortBy, timeframe, sequenceKey, limit, contentType },
            meta
        );

        return { fullQuery, currentUserId, sortBy, meta, limit };
    }

    _applySortingAndSequence(
        { query, projection, options },
        { type, sortBy, timeframe, sequenceKey, limit, contentType },
        meta
    ) {
        super._applySortingAndSequence(
            { query, projection, options },
            { type, sortBy, sequenceKey, limit, contentType }
        );

        switch (sortBy) {
            case 'popular':
                const { ids, newSequenceKey } = this._postFeedCache.getIdsWithSequenceKey({
                    communityId: query.communityId,
                    sortBy,
                    timeframe,
                    sequenceKey,
                    limit,
                });

                delete query.communityId;
                meta.newSequenceKey = newSequenceKey;
                query._id = { $in: ids };
                break;
        }
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
        sortBy,
        tags,
        ...params
    }) {
        params = {
            ...params,
            ...super._normalizeParams({ sortBy, ...params }),
        };

        sortBy = params.sortBy;

        if (sortBy === 'popular' && (type !== 'community' || tags)) {
            throw { code: 400, message: `Invalid sorting for - ${type}` };
        }

        if (tags && !Array.isArray(tags)) {
            throw { code: 400, message: 'Invalid tags param' };
        }

        return { type, currentUserId, requestedUserId, communityId, tags, ...params };
    }

    async _applyFeedTypeConditions({ query }, { type, requestedUserId, communityId, tags }) {
        switch (type) {
            case 'subscriptions':
                await this._applyUserSubscriptions(query, requestedUserId);
                break;

            case 'byUser':
                query['contentId.userId'] = requestedUserId;
                break;

            case 'community':
                if (tags) {
                    query['content.tags'] = { $in: tags };
                }

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

    _getSequenceKey(models, { sortBy, limit }, meta) {
        const origin = super._getSequenceKey(models, sortBy);

        switch (sortBy) {
            case 'popular':
                return this._getCachedSequenceKey(models, limit, meta);

            default:
                return origin;
        }
    }

    _finalizeSorting(modelObjects, sortBy, fullQuery) {
        switch (sortBy) {
            case 'popular':
                return this._finalizeCachedSorting(modelObjects, fullQuery.query);
            default:
                return modelObjects;
        }
    }
}

module.exports = Feed;
