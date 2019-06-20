const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class Block extends BasicController {
    constructor({ connector, prismService }) {
        super({ connector });

        this._prismService = prismService;
        this._blockWaiters = new Set();
        this._transactionWaiters = new Set();

        this._prismService.on('blockDone', this._releaseBlockWaiters.bind(this));
        this._prismService.on('transactionDone', this._releaseTransactionWaiters.bind(this));

        // Low block flow optimization
        setInterval(() => {
            this._releaseBlockWaiters();
            this._releaseTransactionWaiters();
        }, env.GLS_MAX_WAIT_FOR_BLOCKCHAIN_TIMEOUT / 4);
    }

    waitForBlock({ blockNum }) {
        return new Promise((resolve, reject) => {
            const resolved = this._tryResolveBlockWaiter(blockNum, resolve);

            if (resolved) {
                return;
            }

            this._blockWaiters.add({
                resolve,
                reject,
                blockNum,
                startTime: new Date(),
            });
        });
    }

    waitForTransaction({ transactionId }) {
        return new Promise((resolve, reject) => {
            const resolved = this._tryResolveTransactionWaiter(transactionId, resolve);

            if (resolved) {
                return;
            }

            this._transactionWaiters.add({
                resolve,
                reject,
                transactionId,
                startTime: new Date(),
            });
        });
    }

    _releaseBlockWaiters() {
        const released = new Set();
        const waiters = this._blockWaiters;

        for (const waiter of waiters) {
            const { resolve, reject, blockNum, startTime } = waiter;
            const resolved = this._tryResolveBlockWaiter(blockNum, resolve);

            if (resolved) {
                released.add(waiter);
                continue;
            }

            if (this._isExpired(startTime)) {
                released.add(waiter);
                this._rejectTimeout(reject);
            }
        }

        this._removeReleased(waiters, released);
    }

    _tryResolveBlockWaiter(blockNum, resolve) {
        const currentBlockNum = this._prismService.getCurrentBlockNum();

        if (currentBlockNum >= blockNum) {
            resolve();
            return true;
        }
    }

    _releaseTransactionWaiters() {
        const released = new Set();
        const waiters = this._transactionWaiters;

        for (const waiter of waiters) {
            const { resolve, reject, transactionId, startTime } = waiter;
            const resolved = this._tryResolveTransactionWaiter(transactionId, resolve);

            if (resolved) {
                released.add(waiter);
                continue;
            }

            if (this._isExpired(startTime)) {
                released.add(waiter);
                this._rejectTimeout(reject);
            }
        }

        this._removeReleased(waiters, released);
    }

    _tryResolveTransactionWaiter(transactionId, resolve) {
        if (this._prismService.hasRecentTransaction(transactionId)) {
            resolve();
            return true;
        }
    }

    _isExpired(startTime) {
        return Number(startTime) + Number(env.GLS_MAX_WAIT_FOR_BLOCKCHAIN_TIMEOUT) < new Date();
    }

    _rejectTimeout(reject) {
        reject({ code: 408, message: 'Request timeout' });
    }

    _removeReleased(waiters, released) {
        for (const waiter of released) {
            waiters.delete(waiter);
        }
    }
}

module.exports = Block;
