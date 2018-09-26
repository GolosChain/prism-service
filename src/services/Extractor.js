const core = require('gls-core-service');
const Logger = core.utils.Logger;
const stats = core.statsClient;
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const BlockSubscribeRestore = core.services.BlockSubscribeRestore;
const env = require('../env');

class Extractor extends BasicService {
    constructor() {
        super();

        this._blockQueue = [];
        this._subscribe = new BlockSubscribe();
        this.addNested(this._subscribe);
    }

    async start() {
        await this.restore();
        await this._subscribe.start((block, blockNum) => {
            this._blockQueue.push([block, blockNum]);
        });

        this._runIterator().catch((error) => {
            stats.increment('extractor_iteration_error');
            Logger.error(`Extractor iteration error - ${error}`);
            process.exit(1);
        });
    }

    async stop() {
        await this.stopNested();
    }

    async restore() {
        // TODO -
    }

    async _runIterator() {
        while (true) {
            await this._tick();
            await new Promise((resolve) => {
                setImmediate(resolve);
            });
        }
    }

    async _tick() {
        let blockData;

        while (blockData = this._blockQueue.shift()) {
            const [block, blockNum] = blockData;

            await this._handleBlock(block, blockNum);
        }
    }

    async _handleBlock(block, blockNum) {
        // TODO -
    }
}

module.exports = Cleaner;
