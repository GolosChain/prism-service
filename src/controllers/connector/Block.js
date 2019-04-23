const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class Block extends BasicController {
    constructor({ connector, prismService }) {
        super({ connector });

        this._prismService = prismService;
    }

    waitForBlock({ blockNum }) {
        return new Promise((resolve, reject) => {
            const currentBlockNum = this._prismService.getCurrentBlockNum();

            if (currentBlockNum >= blockNum) {
                resolve();
                return;
            }

            const stopFlag = this._makeStopFlag();

            this._startBlockNumChecker(blockNum, resolve, stopFlag);
            this._setWatchDog(stopFlag, reject);
        });
    }

    waitForTransaction({ transactionId }) {
        return new Promise((resolve, reject) => {
            if (this._prismService.hasRecentTransaction(transactionId)) {
                resolve();
                return;
            }

            const stopFlag = this._makeStopFlag();

            this._startTransactionIdChecker(transactionId, resolve, stopFlag);
            this._setWatchDog(stopFlag, reject);
        });
    }

    _startBlockNumChecker(blockNum, resolve, stopFlag) {
        this._prismService.once('blockDone', currentBlockNum => {
            if (this._isStopped(stopFlag)) {
                return;
            }

            if (currentBlockNum >= blockNum) {
                resolve();
            } else {
                // Avoid potential max call stack size error
                setImmediate(() => this._startBlockNumChecker(blockNum, resolve, stopFlag));
            }
        });
    }

    _startTransactionIdChecker(transactionId, resolve, stopFlag) {
        this._prismService.once('transactionDone', currentTransactionId => {
            if (this._isStopped(stopFlag)) {
                return;
            }

            if (currentTransactionId === transactionId) {
                resolve();
            } else {
                // Avoid potential max call stack size error
                setImmediate(() =>
                    this._startTransactionIdChecker(transactionId, resolve, stopFlag)
                );
            }
        });
    }

    _setWatchDog(stopFlag, reject) {
        setTimeout(() => {
            this._markStopped(stopFlag);
            reject({ code: 408, message: 'Request timeout' });
        }, env.GLS_MAX_WAIT_FOR_BLOCKCHAIN_TIMEOUT);
    }

    _makeStopFlag() {
        return { stop: false };
    }

    _isStopped(stopFlag) {
        return stopFlag.stop;
    }

    _markStopped(stopFlag) {
        stopFlag.stop = true;
    }
}

module.exports = Block;
