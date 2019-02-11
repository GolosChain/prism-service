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

    _getSequenceKey(sortBy, models) {
        switch (sortBy) {
            case 'byTime':
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
