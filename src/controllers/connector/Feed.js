const moment = require('moment');
const env = require('../../data/env');
const AbstractFeed = require('./AbstractFeed');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');

class Feed extends AbstractFeed {
    constructor({ postFeedCache, ...other }) {
        super(other);

        this._postFeedCache = postFeedCache;
    }

    async getFeed(params) {
        await this._tryApplyUserIdByName(params);

        const {
            fullQuery,
            currentUserId,
            sortBy,
            meta,
            limit,
            contentType,
            app,
            type,
            tags,
            sequenceKey,
        } = await this._prepareQuery(params);

        let modelObjects = await PostModel.find(...Object.values(fullQuery));

        if (!modelObjects || modelObjects.length === 0) {
            return this._makeEmptyFeedResult();
        }

        modelObjects = this._finalizeSorting(modelObjects, sortBy, fullQuery);

        await this._populate({ modelObjects, currentUserId, contentType, app, type, fullQuery });

        const communityId = modelObjects[0].communityId || modelObjects[0].community.id;

        await this._applyPayouts(modelObjects, communityId);

        return this._makeFeedResult(modelObjects, { sortBy, limit, tags, sequenceKey }, meta);
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
            app,
        } = this._normalizeParams(params);

        const query = {};
        const projection = {
            'content.body.full': false,
        };
        const options = { lean: true };
        const fullQuery = { query, projection, options };
        const meta = {};

        if (contentType !== 'mobile') {
            projection['content.body.mobile'] = false;
        }

        await this._applyFeedTypeConditions(fullQuery, {
            type,
            requestedUserId,
            communityId,
            tags,
            timeframe,
        });
        this._applySortingAndSequence(
            fullQuery,
            { type, sortBy, timeframe, sequenceKey, limit, contentType, tags },
            meta
        );

        return {
            fullQuery,
            currentUserId,
            sortBy,
            meta,
            limit,
            contentType,
            app,
            type,
            tags,
            sequenceKey,
        };
    }

    _applySortingAndSequence(
        { query, projection, options },
        { type, sortBy, timeframe, sequenceKey, limit, contentType, tags },
        meta
    ) {
        super._applySortingAndSequence(
            { query, projection, options },
            { type, sortBy, sequenceKey, limit, contentType }
        );

        switch (sortBy) {
            case 'popular':
                if ((Array.isArray(tags) && tags.length) || !env.GLS_USE_IN_MEMORY_FEED_CACHE) {
                    this._applyPopularSortingByTags({ timeframe, options, sequenceKey });
                } else {
                    this._applyCachedPopularSorting({
                        query,
                        sortBy,
                        timeframe,
                        sequenceKey,
                        limit,
                        meta,
                    });
                }
                break;
        }
    }

    _applyCachedPopularSorting({ query, sortBy, timeframe, sequenceKey, limit, meta }) {
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
    }

    _applyPopularSortingByTags({ timeframe, options, sequenceKey }) {
        options.skip = Number(sequenceKey) || 0;
        options.sort = options.sort || {};

        switch (timeframe) {
            case 'day':
            case 'week':
            case 'month':
            case 'year':
            case 'all':
                options.sort['stats.rShares'] = -1;
                break;

            case 'WilsonHot':
                options.sort[`stats.hot`] = -1;
                break;

            case 'WilsonTrending':
                options.sort[`stats.tranding`] = -1;
                break;

            default:
                Logger.warn('Unknown timeframe:', timeframe);
        }
    }

    _applySortByTime({ query, options, sequenceKey, direction }) {
        super._applySortByTime({ query, options, sequenceKey, direction });

        options.sort = { _id: direction };
    }

    async _populate({ modelObjects, currentUserId, contentType, app, type, fullQuery }) {
        if (type === 'byUser' || type === 'subscriptions') {
            await this._populateReposts(modelObjects, fullQuery.projection);
        }

        await this._tryApplyVotesForModels({ Model: PostModel, modelObjects, currentUserId });
        await this._populateAuthors(modelObjects, app);
        await this._populateCommunities(modelObjects);
        await this._populateViewCount(modelObjects);

        if (contentType === 'mobile') {
            this._prepareMobile(modelObjects);
        }
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

        if (tags && !Array.isArray(tags)) {
            throw { code: 400, message: 'Invalid tags param' };
        }

        return { type, currentUserId, requestedUserId, communityId, tags, ...params };
    }

    async _applyFeedTypeConditions(
        { query, projection },
        { type, requestedUserId, communityId, tags, timeframe }
    ) {
        switch (type) {
            case 'subscriptions':
                await this._applyUserSubscriptions(query, requestedUserId);
                break;

            case 'byUser':
                query.$or = [
                    { 'contentId.userId': requestedUserId },
                    { 'repost.userId': requestedUserId },
                ];
                break;

            case 'community':
                query['repost.isRepost'] = { $ne: true };
                projection.repost = false;

                if (Array.isArray(tags) && tags.length) {
                    query['content.tags'] = { $in: tags };
                }

                if (!env.GLS_USE_IN_MEMORY_FEED_CACHE) {
                    this._applyNotInMemoryFeedQuery({ query, timeframe });
                }

            default:
                query.communityId = communityId;
        }
    }

    _applyNotInMemoryFeedQuery({ query, timeframe }) {
        let timeAgo = null;

        switch (timeframe) {
            case 'day':
                timeAgo = this._daysAgo(1);
                break;

            case 'week':
                timeAgo = this._daysAgo(7);
                break;

            case 'month':
                timeAgo = this._daysAgo(30);
                break;

            case 'year':
                timeAgo = this._daysAgo(365);
                break;

            case 'all':
            case 'WilsonHot':
            case 'WilsonTrending':
                // Do nothing
                break;

            default:
                Logger.warn('Unknown timeframe:', timeframe);
        }

        if (timeAgo) {
            query['meta.time'] = query['meta.time'] || {};
            query['meta.time'].$gte = timeAgo;
        }
    }

    _daysAgo(amount) {
        return moment()
            .subtract(amount, 'days')
            .toDate();
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

    _prepareMobile(modelObjects) {
        for (const modelObject of modelObjects) {
            this._applyMobilePreview(modelObject);
        }
    }

    _applyMobilePreview(modelObject) {
        const body = modelObject.content.body;

        body.mobilePreview = [
            {
                type: 'text',
                content: body.preview,
            },
        ];

        this._tryAddMobileImageFromContent(modelObject) ||
            this._tryAddMobileImageFromEmbeds(modelObject);

        delete body.preview;
        delete body.mobile;
    }

    _findMobileImage(chunks) {
        return chunks.find(({ type }) => type === 'image') || null;
    }

    _extractEmbedsThumbnail(embeds) {
        if (embeds && embeds.result && embeds.result.thumbnail_url) {
            return {
                src: embeds.result.thumbnail_url,
                width: embeds.result.thumbnail_width || null,
                height: embeds.result.thumbnail_height || null,
            };
        }

        return null;
    }

    _tryAddMobileImageFromContent(modelObject) {
        const body = modelObject.content.body;
        const image = this._findMobileImage(body.mobile);

        if (image) {
            body.mobilePreview.push({
                type: 'image',
                src: image.src,
                width: image.width || null,
                height: image.height || null,
            });

            return true;
        }

        return false;
    }

    _tryAddMobileImageFromEmbeds(modelObject) {
        const body = modelObject.content.body;
        const embeds = modelObject.embeds;
        const embedsImage = this._extractEmbedsThumbnail(embeds);

        if (embedsImage) {
            body.mobilePreview.push({
                type: 'image',
                src: embedsImage.src,
                width: embedsImage.width,
                height: embedsImage.height,
            });

            return true;
        }

        return false;
    }

    _getSequenceKey(models, { sortBy, limit, tags, sequenceKey }, meta) {
        const origin = super._getSequenceKey(models, sortBy);

        switch (sortBy) {
            case 'popular':
                if ((!Array.isArray(tags) || !tags.length) && env.GLS_USE_IN_MEMORY_FEED_CACHE) {
                    return this._getCachedSequenceKey(models, limit, meta);
                }

                sequenceKey = Number(sequenceKey) || 0;

                const arrayResult = this._makeArrayPaginationResult(models, sequenceKey, limit);

                return arrayResult.sequenceKey;

            default:
                return origin;
        }
    }

    _finalizeSorting(modelObjects, sortBy, fullQuery) {
        switch (sortBy) {
            case 'popular':
                if (!fullQuery.query['content.tags'] && env.GLS_USE_IN_MEMORY_FEED_CACHE) {
                    return this._finalizeCachedSorting(modelObjects, fullQuery.query);
                }

                return modelObjects;

            default:
                return modelObjects;
        }
    }
}

module.exports = Feed;
