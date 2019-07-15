const AbstractFeedCache = require('./AbstractFeedCache');
const PopularCache = require('../controllers/feedCache/Popular');

class PostFeedCache extends AbstractFeedCache {
    async start() {
        await super.start(new PopularCache());
    }

    getIdsWithSequenceKey({ communityId = '~all', sortBy, timeframe = 'day', sequenceKey, limit }) {
        return super.getIdsWithSequenceKey({ communityId, sortBy, timeframe, sequenceKey, limit });
    }

    async _getIds(sortBy, communityId, timeframe) {
        switch (sortBy) {
            case 'popular':
                const start = Date.now();

                const result = await this._getController().getFor(communityId, timeframe);

                console.log(`it takes: ${Date.now() - start}ms`);

                return result;

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
