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

            this._startBlockChecker(blockNum, resolve);
        });
    }

    _startBlockChecker(blockNum, resolve) {
        this._prismService.once('blockDone', currentBlockNum => {
            if (currentBlockNum >= blockNum) {
                resolve();
            } else {
                // Avoid max call stack size error
                setImmediate(() => this._startBlockChecker(blockNum, resolve));
            }
        });
    }
}

module.exports = Block;
