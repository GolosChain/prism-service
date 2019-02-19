const core = require('gls-core-service');
const Logger = core.utils.Logger;
const AbstractFeed = require('./AbstractFeed');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');

class Feed extends AbstractFeed {
    async getFeed(params) {
        const { fullQuery, currentUserId, sortBy } = await this._prepareQuery(params);
        const modelObjects = await PostModel.find(...fullQuery);

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
            sequenceKey,
            limit,
            currentUserId,
            requestedUserId,
            communityId,
        } = this._normalizeParams(params);

        const query = {};
        const options = { lean: true };
        const projection = {
            'content.body.full': false,
        };
        const fullQuery = { query, projection, options };

        this._applySortingAndSequence(fullQuery, { sortBy, sequenceKey, limit });
        await this._applyFeedTypeConditions(fullQuery, {
            type,
            requestedUserId,
            communityId,
        });

        return { fullQuery, currentUserId, sortBy };
    }

    async _populate(modelObjects, currentUserId) {
        this._tryApplyVotesForModels({ Model: PostModel, modelObjects, currentUserId });
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
                query['id.userId'] = requestedUserId;
                break;

            case 'community':
            default:
                query.communityId = communityId;
        }
    }

    async _applyUserSubscriptions(query, requestedUserId) {
        const model = await ProfileModel.findOne(
            { id: requestedUserId },
            { subscriptions: true, _id: false }
        );

        if (!model) {
            throw { code: 400, message: 'Bad user id' };
        }

        query['communityId'] = { $in: model.subscriptions.communityIds };
    }

    async _populateAuthors(modelObjects) {
        await this._populateWithCache(modelObjects, this._populateAuthor);
    }

    async _populateAuthor(modelObject, authors) {
        const id = modelObject.id.userId;

        if (authors.has(id)) {
            modelObject.author = authors.get(id);
        } else {
            const profile = await ProfileModel.findOne({ id }, { username: true, _id: false });

            if (!profile) {
                Logger.error(`Feed - unknown user - ${id}`);
                return;
            }

            modelObject.author = { username: profile.username };
        }
    }

    async _populateCommunities(modelObjects) {
        await this._populateWithCache(modelObjects, this._populateCommunity);
    }

    async _populateCommunity(modelObject, communities) {
        const id = modelObject.communityId;

        if (communities.has(id)) {
            modelObject.community = communities.get(id);
        } else {
            // TODO After MVP
            modelObject.community = {
                id: 'gls',
                name: 'GOLOS',
                avatarUrl: 'none', // TODO Set before MVP
            };

            communities.set(id, modelObject.community);
        }

        delete modelObject.communityId;
    }

    async _populateWithCache(modelObjects, method) {
        const cacheMap = new Map();

        for (const modelObject of modelObjects) {
            await method.call(this, modelObject, cacheMap);
        }
    }
}

module.exports = Feed;
