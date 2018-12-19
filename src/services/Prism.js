const sleep = require('then-sleep');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const stats = core.utils.statsClient;
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const Controller = require('../controllers/prism/Main');
const RawBlockRestore = require('../services/RawBlockRestore');
const ForkRestore = require('../utils/ForkRestore');
const RawBlock = require('../models/RawBlock');

class Prism extends BasicService {
    constructor({ chainPropsService, feedPriceService }) {
        super();

        this._inForkState = false;

        this._controller = new Controller({ chainPropsService, feedPriceService });
        this._blockQueue = [];
    }

    async start() {
        const lastBlockNum = await this._getLastBlockNum();

        this._subscribe = new BlockSubscribe(lastBlockNum);
        this.addNested(this._subscribe);

        this._subscribe.on('block', this._handleBlock.bind(this));
        this._subscribe.on('fork', this._handleFork.bind(this));

        await this._subscribe.start();
        this._runExtractorLoop().catch(error => {
            Logger.error(`Prism error - ${error.stack}`);
            process.exit(1);
        });
    }

    async _handleBlock(block, blockNum) {
        if (!this._inForkState) {
            this._blockQueue.push([block, blockNum]);

            await RawBlock.insert({ blockNum, ...block });
        }
    }

    async _handleFork() {
        const restorer = new ForkRestore();

        this._inForkState = true;

        await sleep(0);

        Logger.info('Fork detected! Revert...');
        await restorer.revert();

        Logger.info('Revert done, exit for restart.');
        process.exit(0);
    }

    async stop() {
        await this.stopNested();
    }

    async _runExtractorLoop() {
        while (true) {
            await this._extractFromQueue();
            await sleep(0);
        }
    }

    async _extractFromQueue() {
        let blockData;

        while ((blockData = this._blockQueue.shift())) {
            const timer = new Date();

            await this._controller.disperse(blockData);
            stats.timing('block_disperse', new Date() - timer);
        }
    }

    async _getLastBlockNum() {
        const model = await RawBlock.findOne(
            {},
            { blockNum: true, _id: false },
            { sort: { blockNum: -1 } }
        );

        if (!model) {
            await this._restoreRawBlocks();

            return await this._getLastBlockNum();
        }

        return model.blockNum;
    }

    async _restoreRawBlocks() {
        const restorer = new RawBlockRestore();

        await restorer.start(0);

        for (let model of RawBlock.find({}, { sort: { blockNum: 1 } }).cursor()) {
            await this._handleBlock(model.toObject(), model.blockNum);
        }
    }
}

module.exports = Prism;
