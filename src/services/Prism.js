const core = require('gls-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const { Logger, GenesisProcessor } = core.utils;

const env = require('../data/env');
const MainPrismController = require('../controllers/prism/Main');
const GenesisController = require('../controllers/prism/GenesisContent');
const ServiceMetaModel = require('../models/ServiceMeta');

class Prism extends BasicService {
    constructor(...args) {
        super(...args);

        this.getEmitter().setMaxListeners(Infinity);
    }

    setForkService(forkService) {
        this._forkService = forkService;
    }

    setConnector(connector) {
        this._connector = connector;
    }

    async start() {
        const meta = await this._getMeta();

        if (!meta.isGenesisApplied && env.GLS_USE_GENESIS) {
            await this._processGenesis();
            await this._updateMeta({ isGenesisApplied: true });
        }

        this._blockInProcessing = false;
        this._blockQueue = [];
        this._recentTransactions = new Set();
        this._currentBlockNum = 0;
        this._mainPrismController = new MainPrismController({
            connector: this._connector,
            forkService: this._forkService,
        });

        this._subscriber = new BlockSubscribe({
            handler: this._handleEvent.bind(this),
        });

        const lastBlockInfo = await this._subscriber.getLastBlockMetaData();
        Logger.info('Last block info:', lastBlockInfo);

        if (lastBlockInfo.lastBlockNum !== 0) {
            await this._revertLastBlock();
        }

        try {
            await this._subscriber.start();
        } catch (error) {
            Logger.error('Cant start block subscriber:', error);
        }
    }

    getCurrentBlockNum() {
        return this._currentBlockNum;
    }

    hasRecentTransaction(id) {
        return this._recentTransactions.has(id);
    }

    /**
     * Обработка событий из BlockSubscribe.
     * @param {'BLOCK'|'FORK'|'IRREVERSIBLE_BLOCK'} type
     * @param {Object} data
     * @private
     */
    async _handleEvent({ type, data }) {
        switch (type) {
            case BlockSubscribe.EVENT_TYPES.BLOCK:
                await this._registerNewBlock(data);
                break;
            case BlockSubscribe.EVENT_TYPES.IRREVERSIBLE_BLOCK:
                await this._handleIrreversibleBlock(data);
                break;
            case BlockSubscribe.EVENT_TYPES.FORK:
                Logger.warn(`Fork detected, new safe base on block num: ${data.baseBlockNum}`);
                await this._handleFork(data.baseBlockNum);
                break;
            default:
        }
    }

    async _registerNewBlock(block) {
        this._blockQueue.push(block);
        await this._handleBlockQueue(block.blockNum);
    }

    async _handleBlockQueue() {
        if (this._blockInProcessing) {
            return;
        }

        this._blockInProcessing = true;

        let block;

        while ((block = this._blockQueue.shift())) {
            await this._handleBlock(block);
        }

        this._blockInProcessing = false;
    }

    async _handleBlock(block) {
        try {
            await this._forkService.initBlock(block);
            await this._mainPrismController.disperse(block);

            this._emitHandled(block);
        } catch (error) {
            Logger.error(`Cant disperse block, num: ${block.blockNum}, id: ${block.id}`, error);
            process.exit(1);
        }
    }

    _emitHandled(block) {
        const blockNum = block.blockNum;

        this._currentBlockNum = blockNum;

        this.emit('blockDone', blockNum);

        for (const transaction of block.transactions) {
            if (!transaction || !transaction.actions) {
                Logger.warn(`Empty transaction - ${blockNum}`);
                return;
            }

            const id = transaction.id;

            this.emit('transactionDone', id);

            this._recentTransactions.add(id);

            setTimeout(
                // Clean lexical scope for memory optimization
                (id => () => this._recentTransactions.delete(id))(id),
                env.GLS_RECENT_TRANSACTION_ID_TTL
            );
        }
    }

    async _handleIrreversibleBlock(block) {
        await this._forkService.registerIrreversibleBlock(block);
    }

    async _handleFork(baseBlockNum) {
        try {
            await this._forkService.revert(this._subscriber, baseBlockNum);
        } catch (error) {
            Logger.error('Critical error!');
            Logger.error('Cant revert on fork:', error);
            process.exit(1);
        }
    }

    async _revertLastBlock() {
        try {
            await this._forkService.revertLastBlock(this._subscriber);
        } catch (error) {
            Logger.error('Cant revert last block, but continue:', error);
        }
    }

    async _getMeta() {
        return await ServiceMetaModel.findOne(
            {},
            {},
            {
                lean: true,
            }
        );
    }

    async _updateMeta(params) {
        return await ServiceMetaModel.updateOne(
            {},
            {
                $set: params,
            }
        );
    }

    async _processGenesis() {
        const genesisProcessor = new GenesisProcessor({
            genesisController: new GenesisController(),
        });

        await genesisProcessor.process();
    }
}

module.exports = Prism;
