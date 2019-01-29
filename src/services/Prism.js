const sleep = require('then-sleep');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const stats = core.utils.statsClient;
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const BlockUtils = core.utils.Block;
const Controller = require('../controllers/prism/Main');
const RawBlockRestore = require('../services/RawBlockRestore');
const ForkRestore = require('../utils/ForkRestore');
const RawBlockUtil = require('../utils/RawBlock');

class Prism extends BasicService {
    constructor() {
        super();

        this._inForkState = false;

        this._controller = new Controller();
        this._blockQueue = [];
    }

    async start() {
        const lastBlockNum = await this._getLastBlockNum();

        this._subscribe = new BlockSubscribe(lastBlockNum);
        this.addNested(this._subscribe);

        this._subscribe.on('block', this._handleBlock.bind(this));
        this._subscribe.on('fork', this._handleFork.bind(this));

        this._runExtractorLoop().catch(error => {
            Logger.error(`Prism error - ${error.stack}`);
            process.exit(1);
        });

        await this._tryDisperseUnhandledRawBlocks(lastBlockNum);
        await this._subscribe.start();
    }

    async _handleBlock(block, blockNum) {
        if (!this._inForkState) {
            this._blockQueue.push([block, blockNum]);

            await RawBlockUtil.save(block, blockNum, true);
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
        const { lastIrreversibleBlockNum } = await this._chainProsService.getCurrentValues();
        const lastBlockNum = await RawBlockUtil.getLastBlockNum();

        if (lastBlockNum === null) {
            await this._restoreRawBlocks(0);

            return await this._getLastBlockNum();
        } else if (lastBlockNum < lastIrreversibleBlockNum) {
            await this._restoreRawBlocks(lastBlockNum);

            return await this._getLastBlockNum();
        }

        return lastBlockNum;
    }

    async _restoreRawBlocks(lastBlock) {
        const restorer = new RawBlockRestore();

        await restorer.start(lastBlock);
    }

    async _tryDisperseUnhandledRawBlocks(lastBlockNum) {
        Logger.info('Get last dispersed block...');

        const lastDispersedBlockNum = await RawBlockUtil.getLastDispersedBlockNum();

        Logger.info(`Last dispersed block is - ${lastDispersedBlockNum}`);

        if (lastBlockNum !== lastDispersedBlockNum) {
            Logger.info('Start disperse restored blocks...');

            for (let blockNum = lastDispersedBlockNum + 1; blockNum < lastBlockNum; blockNum++) {
                const fullBlock = await RawBlockUtil.getFullBlock(blockNum);

                if (fullBlock === null) {
                    await this._reloadRawBlock(blockNum);
                    blockNum--;
                    continue;
                }

                Logger.log(`Disperse restored block - ${blockNum}`);
                await this._handleBlock(fullBlock, blockNum);
                await RawBlockUtil.markDispersed(blockNum);
            }

            Logger.info('Restore dispersed done!');
        }
    }

    async _reloadRawBlock(blockNum) {
        const block = await BlockUtils.getByNum(blockNum);

        await RawBlockUtil.save(block, blockNum);

        Logger.log(`Raw block reloaded - ${blockNum}`);
    }
}

module.exports = Prism;
