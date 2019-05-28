const core = require('gls-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const Logger = core.utils.Logger;
const env = require('../data/env');
const MainPrismController = require('../controllers/prism/Main');
const GenesisController = require('../controllers/prism/Genesis');
const ServiceMetaModel = require('../models/ServiceMeta');
const RevertTraceModel = require('../models/RevertTrace');

class Prism extends BasicService {
    setConnector(connector) {
        this._connector = connector;

        this.getEmitter().setMaxListeners(Infinity);
    }

    async start() {
        this._blockInProcessing = false;
        this._genesisDataInProcessing = false;
        this._blockQueue = [];
        this._recentTransactions = new Set();
        this._currentBlockNum = 0;
        this._mainPrismController = new MainPrismController({ connector: this._connector });
        this._genesisController = new GenesisController();

        const lastBlock = await this._getLastBlockNum();
        const subscriber = new BlockSubscribe(lastBlock + 1);

        this._inGenesis = lastBlock === 0;

        if (!env.GLS_USE_GENESIS) {
            this._inGenesis = false;
        }

        subscriber.eachBlock(this._registerNewBlock.bind(this));
        subscriber.eachGenesisData(this._handleGenesisData.bind(this));
        subscriber.on('fork', this._handleFork.bind(this));
        subscriber.on('genesisDone', this._handleGenesisComplete.bind(this));

        try {
            await subscriber.start();
        } catch (error) {
            Logger.error(`Cant start block subscriber - ${error.stack}`);
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
        if (this._inGenesis || this._genesisDataInProcessing || this._blockInProcessing) {
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
            const blockNum = block.blockNum;

            await this._openNewRevertZone(blockNum);
            await this._setLastBlockNum(blockNum);
            await this._mainPrismController.disperse(block);

            this._emitHandled(block);
        } catch (error) {
            Logger.error(`Cant disperse block - ${error.stack}`);
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
            // TODO Revert on fork
            // TODO Mark start/stop revert state
            // TODO Revert lastBlockNum
        } catch (error) {
            Logger.error(`Critical error!`);
            Logger.error(`Cant revert on fork - ${error.stack}`);
            process.exit(1);
        }
    }

    async _handleGenesisData(type, data) {
        if (!this._inGenesis) {
            Logger.warn(`Genesis off, but data transfer.`);
            return;
        }

        this._genesisDataInProcessing = true;

        try {
            await this._genesisController.handle(type, data);
        } catch (error) {
            Logger.error(`Critical error!`);
            Logger.error(`Cant handle genesis data - ${error.stack}`);
            process.exit(1);
        }

        this._genesisDataInProcessing = false;
    }

    async _getLastBlockNum() {
        const model = await ServiceMetaModel.findOne({}, { lastBlockNum: true });

        return model.lastBlockNum;
    }

    async _openNewRevertZone(blockNum) {
        const model = new RevertTraceModel({ blockNum });

        await model.save();
    }

    async _setLastBlockNum(blockNum) {
        await ServiceMetaModel.updateOne({}, { $set: { lastBlockNum: blockNum } });
    }

    async _handleGenesisComplete() {
        this._inGenesis = false;
    }
}

module.exports = Prism;
