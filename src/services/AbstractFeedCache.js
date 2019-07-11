const uuid = require('uuid/v4');
const core = require('gls-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const env = require('../data/env');

const NEWEST = 'newest';
const ID_DIVIDER = '|';

class AbstractFeedCache extends BasicService {
    async start(controller) {
        this._cache = new Map();
        this._newestMap = new Map();
        this._inActualization = false;

        this._controller = controller;

        this.startLoop(0, env.GLS_FEED_CACHE_INTERVAL);
    }

    _getController() {
        return this._controller;
    }

    getIdsWithSequenceKey({ communityId, sortBy, timeframe, sequenceKey, limit }) {
        try {
            const [queueId, index] = this._unpackSequenceKey(sequenceKey);
            const storageId = this._makeStorageId({ communityId, sortBy, timeframe, queueId });
            const storage = this._cache.get(storageId);

            if (storage) {
                const lastIndex = index + limit;
                const ids = storage.slice(index, lastIndex);
                let newSequenceKeyId;

                if (this._newestMap.has(storageId)) {
                    newSequenceKeyId = this._extractQueueId(this._newestMap.get(storageId));
                } else {
                    newSequenceKeyId = queueId;
                }

                const newSequenceKey = [newSequenceKeyId, lastIndex].join(ID_DIVIDER);

                return { ids, newSequenceKey };
            } else {
                throw 'Unknown cache point';
            }
        } catch (error) {
            Logger.log(
                `Unknown cache point - ${[communityId, sortBy, timeframe, sequenceKey].join(
                    ID_DIVIDER
                )}`
            );
            throw { code: 410, message: 'Unknown or outdated sequence key' };
        }
    }

    _unpackSequenceKey(sequenceKey) {
        if (sequenceKey) {
            const [queueId, indexString] = sequenceKey.split(ID_DIVIDER);
            const index = Number(indexString);

            return [queueId, index];
        } else {
            return [NEWEST, 0];
        }
    }

    _makeStorageId({ communityId, sortBy, timeframe, queueId }) {
        return [communityId, sortBy, timeframe, queueId].join(ID_DIVIDER);
    }

    _extractQueueId(storageId) {
        return storageId.split(ID_DIVIDER)[3];
    }

    iteration() {
        if (this._inActualization) {
            Logger.warn('Miss actualization - server so slow or critical unhandled error!');
            return;
        }

        const start = Date.now();
        Logger.log('Start actualization feed cache:', this.constructor.name);

        this._inActualization = true;

        this._actualize().then(
            () => {
                this._inActualization = false;
                Logger.log(
                    `Stop actualization feed cache: ${(Date.now() - start) / 1000}s,`,
                    this.constructor.name
                );
            },
            error => {
                Logger.error(`Critical feed cache error - ${error.stack}`);
                this._inActualization = false;
            }
        );
    }

    async _actualize(sync = true) {
        for await (const variant of this._makeVariantsIterator()) {
            Logger.log('Actualize feed for:', variant);

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
            Logger.error('Cant actualize feed cache:', error);
            process.exit(1);
        }
    }

    async _actualizeBy(communityId, sortBy, timeframe) {
        const queueId = uuid();
        const factors = { communityId, sortBy, timeframe, queueId };
        const storageId = this._makeStorageId(factors);
        const newestFactors = { communityId, sortBy, timeframe, queueId: NEWEST };
        const newestStorageId = this._makeStorageId(newestFactors);
        const ids = await this._getIds(sortBy, communityId, timeframe);

        this._cache.set(storageId, ids);
        this._cache.set(newestStorageId, ids);
        this._newestMap.set(newestStorageId, storageId);

        setTimeout(() => {
            this._cache.delete(storageId);
        }, env.GLS_FEED_CACHE_TTL);
    }

    async _getIds(sortBy, communityId, timeframe) {
        // Abstract
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
        // Abstract
    }

    _getTimeframeVariants() {
        // Abstract
    }
}

module.exports = AbstractFeedCache;
