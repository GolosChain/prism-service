const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;
const AbstractContent = require('./AbstractContent');
const env = require('../../data/env');

class AbstractFeed extends AbstractContent {
    _normalizeParams({ sortBy = 'time', sequenceKey, limit = 10 }) {
        sortBy = String(sortBy);
        limit = Number(limit);

        if (Number.isNaN(limit) || limit > env.GLS_MAX_FEED_LIMIT || limit < 1) {
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
            case 'timeDesc':
                this._applySortByTime({ query, options, sequenceKey, direction: -1 });
                break;
            case 'time':
            default:
                this._applySortByTime({ query, options, sequenceKey, direction: 1 });
        }
    }

    _applySortByTime({ query, options, sequenceKey, direction }) {
        if (!sequenceKey) {
            return;
        }

        try {
            MongoDB.mongoTypes.ObjectId(sequenceKey);
        } catch (error) {
            this._throwBadSequence();
        }

        if (direction > 0) {
            query._id = { $gt: sequenceKey };
        } else {
            query._id = { $lt: sequenceKey };
        }
    }

    _throwBadSequence() {
        throw { code: 400, message: 'Bad sequence params' };
    }

    _makeFeedResult(modelObjects, sortBy, meta) {
        const sequenceKey = this._getSequenceKey(modelObjects, sortBy, meta);

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
            case 'timeDesc':
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
}

module.exports = AbstractFeed;
