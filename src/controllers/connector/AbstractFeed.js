const core = require('gls-core-service');
const Logger = core.utils.Logger;
const AbstractContent = require('./AbstractContent');
const env = require('../../data/env');
const ProfileModel = require('../../models/Profile');

class AbstractFeed extends AbstractContent {
    _normalizeParams({ sortBy = 'time', sequenceKey, limit = 10 }) {
        sortBy = String(sortBy);
        limit = Number(limit);

        if (limit > env.GLS_MAX_FEED_LIMIT || limit < 1) {
            limit = env.GLS_MAX_FEED_LIMIT;
        }

        return { sortBy, sequenceKey, limit };
    }

    _applySortingAndSequence({ query, projection, options }, { sortBy, sequenceKey, limit }) {
        options.limit = limit;
        projection.__v = false;
        projection.createdAt = false;
        projection.updatedAt = false;
        projection['votes.upUserIds'] = false;
        projection['votes.downUserIds'] = false;

        switch (sortBy) {
            case 'timeInverted':
                this._applySortByTime({ query, options, sequenceKey, direction: -1 });
                break;
            case 'time':
            default:
                this._applySortByTime({ query, options, sequenceKey, direction: 1 });
        }

        return { query, options };
    }

    _applySortByTime({ query, options, sequenceKey, direction }) {
        if (sequenceKey) {
            if (typeof sequenceKey !== 'string') {
                this._throwBadSequence();
            }

            if (direction > 0) {
                query._id = { $gt: sequenceKey };
            } else {
                query._id = { $lt: sequenceKey };
            }

            options.sort = { _id: direction };
        }
    }

    _throwBadSequence() {
        throw { code: 400, message: 'Bad sequence params' };
    }

    _makeFeedResult(modelObjects, sortBy) {
        const sequenceKey = this._getSequenceKey(modelObjects, sortBy);

        for (const modelObject of modelObjects) {
            delete modelObject._id;
        }

        return {
            items: modelObjects,
            sequenceKey,
        };
    }

    _makeEmptyFeedResult() {
        return {
            items: [],
            sequenceKey: null,
        };
    }

    _getSequenceKey(models, sortBy) {
        switch (sortBy) {
            case 'timeInverted':
            case 'time':
            default:
                return this._getSequenceKeyByTime(models);
        }
    }

    _getSequenceKeyByTime(models) {
        if (models.length === 0) {
            return null;
        } else {
            return models[models.length - 1]._id;
        }
    }

    async _populateAuthors(modelObjects) {
        await this._populateWithCache(modelObjects, this._populateAuthor);
    }

    async _populateAuthor(modelObject, authors) {
        const id = modelObject.contentId.userId;

        if (authors.has(id)) {
            modelObject.author = authors.get(id);
        } else {
            const profile = await ProfileModel.findOne({ contentId: id }, { username: true, _id: false });

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

module.exports = AbstractFeed;
