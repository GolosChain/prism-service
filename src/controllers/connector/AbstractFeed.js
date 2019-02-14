const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class AbstractFeed extends BasicController {
    _normalizeParams({ sortBy = 'time', sequenceKey, limit = 10 }) {
        sortBy = String(sortBy);
        limit = Number(limit);

        if (limit > env.GLS_MAX_FEED_LIMIT || limit < 1) {
            limit = env.GLS_MAX_FEED_LIMIT;
        }

        return { sortBy, sequenceKey, limit };
    }

    _applySortingAndSequence({ query, options }, { sortBy, sequenceKey, limit }) {
        options.limit = limit;

        switch (sortBy) {
            case 'byTime':
            default:
                this._applySortByTime(query, options, sequenceKey);
        }

        return { query, options };
    }

    _applySortByTime(query, options, sequenceKey) {
        if (sequenceKey) {
            if (typeof sequenceKey !== 'string') {
                this._throwBadSequence();
            }

            query._id = { $lt: sequenceKey };
            options.sort = { _id: -1 };
        }
    }

    _throwBadSequence() {
        throw { code: 400, message: 'Bad sequence params' };
    }

    _applyVoteMarkers(models, userId) {
        for (const model of models) {
            const votes = model.votes;

            if (userId) {
                votes.upByUser = votes.upUserIdList.includes(userId);
                votes.downByUser = votes.downUserIdList.includes(userId);
            } else {
                votes.upByUser = false;
                votes.downByUser = false;
            }

            delete votes.upUserIdList;
            delete votes.downUserIdList;
        }
    }

    _getSequenceKey(models, sortBy) {
        switch (sortBy) {
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

    _makeFeedResult(models, sortBy) {
        const sequenceKey = this._getSequenceKey(models, sortBy);

        for (const model of models) {
            delete model._id;
        }

        return {
            items: models,
            sequenceKey,
        };
    }
}

module.exports = AbstractFeed;
