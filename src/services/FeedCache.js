const core = require('gls-core-service');
const Logger = core.utils.Logger;
const BasicService = core.services.Basic;

const NEWEST = 'newest';

class FeedCache extends BasicService {
    async start() {
        this._cache = new Map();
    }

    async iteration() {
        // TODO -
    }

    getIdsWithSequenceKey({ communityId = '~all', sortBy, timeframe, sequenceKey, limit }) {
        try {
            let queueId = NEWEST;
            let index = 0;

            if (sequenceKey) {
                [queueId, index] = sequenceKey.split('|');
            }

            const key = [communityId, sortBy, timeframe, queueId].join('|');
            const storage = this._cache.get(key);

            if (storage) {
                const ids = storage.slice(index, index + limit);
                const newSequenceKey = ids[ids.length - 1] || null;

                return { ids, newSequenceKey };
            } else {
                return { ids: [], newSequenceKey: null };
            }
        } catch (error) {
            Logger.log(
                `Unknown feed cache point - ${[
                    communityId,
                    sortBy,
                    timeframe,
                    sequenceKey,
                    limit,
                ].join('|')}`
            );
            return { ids: [], newSequenceKey: null };
        }
    }

    _getCommunities() {
        // TODO Change after blockchain implementation
        return ['gls'];
    }

    _getSortingVariants() {
        return ['popular'];
    }

    _getTimeframeVariants() {
        return ['day', 'week', 'month', 'year', 'all'];
    }
}

module.exports = FeedCache;
