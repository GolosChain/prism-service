const core = require('gls-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const Logger = core.utils.Logger;
const env = require('../data/env');
const MainPrismController = require('../controllers/prism/Main');
const ServiceMetaModel = require('../models/ServiceMeta');
const GenesisProcessor = require('../utils/GenesisProcessor');

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
            blockHandler: this._registerNewBlock.bind(this),
        });

        const lastBlockInfo = await this._subscriber.getLastBlockMetaData();

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
            await this._setLastBlock(block);
            await this._mainPrismController.disperse(block);

            this._emitHandled(block);
        } catch (error) {
            Logger.error('Cant disperse block:', error);
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

    async _handleFork() {
        try {
            await this._forkService.revert(this._subscriber);
            Logger.log('Shutdown on fork revert complete.');
            process.exit(0);
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

    async _setLastBlock(block) {
        await this._updateMeta({
            lastBlockNum: block.blockNum,
            lastBlockTime: block.blockTime,
            lastBlockSequence: block.sequence,
        });
    }

    async _processGenesis() {
        const genesis = new GenesisProcessor();
        await genesis.process();
    }
}

module.exports = Prism;
