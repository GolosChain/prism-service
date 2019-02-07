const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class AbstractFeed extends BasicController {
    _normalizeParams({ sortBy = 'time', nextFrom = null, nextAfter = null, limit = 10 }) {
        sortBy = String(sortBy);
        limit = Number(limit);

        if (limit > env.GLS_MAX_FEED_LIMIT || limit < 1) {
            limit = env.GLS_MAX_FEED_LIMIT;
        }

        return { sortBy, nextFrom, nextAfter, limit, userId };
    }

    _applySortingAndSequence({ query, options }, { nextFrom, nextAfter, sortBy, limit }) {
        options.limit = limit;

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
            query.meta.time = { $gte: nextFrom };
        } else if (nextAfter) {
            nextAfter = Number(nextAfter);

            if (isNaN(nextFrom) || !isFinite(nextFrom)) {
                this._throwBadSequence();
            }

            query.meta = {};
            query.meta.time = { $gt: nextAfter };
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
}

module.exports = AbstractFeed;
