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
        } = await this._prepareQuery(params);
        let modelObjects = await PostModel.find(...Object.values(fullQuery));

        if (!modelObjects || modelObjects.length === 0) {
            return this._makeEmptyFeedResult();
        }

        modelObjects = this._finalizeSorting(modelObjects, sortBy, fullQuery);

        await this._populate(modelObjects, currentUserId, contentType, app);
        await this._applyPayouts(modelObjects);

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
        });
        this._applySortingAndSequence(
            fullQuery,
            { type, sortBy, timeframe, sequenceKey, limit, contentType },
            meta
        );

        return { fullQuery, currentUserId, sortBy, meta, limit, contentType, app };
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

    async _populate(modelObjects, currentUserId, contentType, app) {
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
