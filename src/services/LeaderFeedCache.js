const AbstractFeedCache = require('./AbstractFeedCache');
const LeaderCache = require('../controllers/feedCache/Leaders');

class LeaderFeedCache extends AbstractFeedCache {
    async start() {
        await super.start(new LeaderCache());
    }

    getIdsWithSequenceKey({
        communityId = '~all',
        sortBy = 'top',
        timeframe = 'all',
        sequenceKey,
        limit,
    }) {
        return super.getIdsWithSequenceKey({ communityId, sortBy, timeframe, sequenceKey, limit });
    }

    async _getIds(sortBy, communityId, timeframe) {
        switch (sortBy) {
            case 'top':
                return await this._getController().getFor(communityId, timeframe);

            default:
                return [];
        }
    }

    _getSortingVariants() {
        return ['top'];
    }

    _getTimeframeVariants() {
        return ['all'];
    }
}

module.exports = LeaderFeedCache;
