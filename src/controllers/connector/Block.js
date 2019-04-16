const core = require('gls-core-service');
const BasicController = core.controllers.Basic;

class Block extends BasicController {
    constructor({ connector, prismService }) {
        super({ connector });

        this._prismService = prismService;
    }

    waitForBlock({ blockNum }) {
        return new Promise(resolve => {
            const currentBlockNum = this._prismService.getCurrentBlockNum();

            if (currentBlockNum >= blockNum) {
                resolve();
                return;
            }

            this._startBlockNumChecker(blockNum, resolve);
        });
    }

    waitForTransaction({ transactionId }) {
        return new Promise(resolve => {
            if (this._prismService.hasRecentTransaction(transactionId)) {
                resolve();
                return;
            }

            this._startTransactionIdChecker(transactionId, resolve);
        });
    }

    _startBlockNumChecker(blockNum, resolve) {
        this._prismService.once('blockDone', currentBlockNum => {
            if (currentBlockNum >= blockNum) {
                resolve();
            } else {
                // Avoid max call stack size error
                setImmediate(() => this._startBlockNumChecker(blockNum, resolve));
            }
        });
    }

    _startTransactionIdChecker(transactionId, resolve) {
        this._prismService.once('transactionDone', currentTransactionId => {
            if (currentTransactionId === transactionId) {
                resolve();
            } else {
                // Avoid max call stack size error
                setImmediate(() => this._startTransactionIdChecker(transactionId, resolve));
            }
        });
    }
}

module.exports = Block;
