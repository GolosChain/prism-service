const uuid = require('uuid/v4');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const BasicService = core.services.Basic;
const env = require('../data/env');
const Popular = require('../controllers/feedCache/Popular');

const NEWEST = 'newest';

class FeedCache extends BasicService {
    async start() {
        this._cache = new Map();
        this._inActualization = false;

        this._popularController = new Popular();

        await this._actualize(true);
        this.startLoop(env.GLS_FEED_CACHE_INTERVAL, env.GLS_FEED_CACHE_INTERVAL);
    }

    getIdsWithSequenceKey({ communityId = '~all', sortBy, timeframe, sequenceKey, limit }) {
        try {
            const [queueId, index] = this._unpackSequenceKey(sequenceKey);
            const storageId = this._makeStorageId({ communityId, sortBy, timeframe, queueId });
            const storage = this._cache.get(storageId);

            if (storage) {
                const ids = storage.slice(index, index + limit);
                const newSequenceKey = ids[ids.length - 1] || null;

                return { ids, newSequenceKey };
            } else {
                return { ids: [], newSequenceKey: null };
            }
        } catch (error) {
            Logger.log(
                `Unknown cache point - ${[communityId, sortBy, timeframe, sequenceKey].join('|')}`
            );
            return { ids: [], newSequenceKey: null };
        }
    }

    _unpackSequenceKey(sequenceKey) {
        if (sequenceKey) {
            return sequenceKey.split('|');
        } else {
            return [NEWEST, 0];
        }
    }

    _makeStorageId({ communityId, sortBy, timeframe, queueId }) {
        return [communityId, sortBy, timeframe, queueId].join('|');
    }

    iteration() {
        if (this._inActualization) {
            Logger.warn('Miss actualization - server so slow or critical unhandled error!');
            return;
        }

        this._inActualization = true;

        this._actualize().then(
            () => {
                this._inActualization = false;
            },
            error => {
                Logger.error(`Critical feed cache error - ${error.stack}`);
                this._inActualization = false;
            }
        );
    }

    async _actualize(sync = false) {
        for (const variant of await this._makeVariantsIterator()) {
            if (sync) {
                await this._tryActualizeBy(...variant);
            } else {
                setImmediate(async () => {
                    await this._tryActualizeBy(...variant);
                });
            }
        }
    }

    async _tryActualizeBy(...variant) {
        try {
            await this._actualizeBy(...variant);
        } catch (error) {
            Logger.error(`Cant actualize feed cache - ${error.stack}`);
            process.exit(1);
        }
    }

    async _actualizeBy(communityId, sortBy, timeframe) {
        const queueId = uuid();
        const factors = { communityId, sortBy, timeframe, queueId };
        const storageId = this._makeStorageId(factors);
        const newestFactors = { communityId, sortBy, timeframe, queueId: NEWEST };
        const newestStorageId = this._makeStorageId(newestFactors);
        let ids = [];

        switch (sortBy) {
            case 'popular':
                ids = this._popularController.getFor(communityId, timeframe);
                break;
        }

        this._cache.set(storageId, ids);
        this._cache.set(newestStorageId, ids);

        setTimeout(() => this._cache.delete(storageId), env.GLS_FEED_CACHE_TTL);
    }

    async *_makeVariantsIterator() {
        for (const community of await this._getCommunities()) {
            for (const sorting of this._getSortingVariants()) {
                for (const timeframe of this._getTimeframeVariants()) {
                    yield [community, sorting, timeframe];
                }
            }
        }
    }

    async _getCommunities() {
        // TODO Change after blockchain implementation
        return ['~all', 'gls'];
    }

    _getSortingVariants() {
        return ['popular'];
    }

    _getTimeframeVariants() {
        return ['day', 'week', 'month', 'year', 'all', 'WilsonHot', 'WilsonTrending'];
    }
}

module.exports = FeedCache;
