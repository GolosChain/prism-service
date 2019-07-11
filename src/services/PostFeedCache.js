const core = require('gls-core-service');
const Logger = core.utils.Logger;
const env = require('../data/env');
const AbstractFeedCache = require('./AbstractFeedCache');
const PopularCache = require('../controllers/feedCache/Popular');

class PostFeedCache extends AbstractFeedCache {
    async start() {
        if (env.GLS_USE_IN_MEMORY_FEED_CACHE) {
            Logger.info('Enable in-memory feed cache.');
            await super.start(new PopularCache());
        } else {
            Logger.info('In-memory feed cache disabled.');
        }
    }

    getIdsWithSequenceKey({ communityId = '~all', sortBy, timeframe = 'day', sequenceKey, limit }) {
        return super.getIdsWithSequenceKey({ communityId, sortBy, timeframe, sequenceKey, limit });
    }

    async _getIds(sortBy, communityId, timeframe) {
        switch (sortBy) {
            case 'popular':
                return await this._getController().getFor(communityId, timeframe);

            default:
                return [];
        }
    }

    _getSortingVariants() {
        return ['popular'];
    }

    _getTimeframeVariants() {
        return ['day', 'week', 'month', 'year', 'all', 'WilsonHot', 'WilsonTrending'];
    }
}

module.exports = PostFeedCache;
