const core = require('gls-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const Logger = core.utils.Logger;
const env = require('../data/env');
const MainPrismController = require('../controllers/prism/Main');
const ServiceMetaModel = require('../models/ServiceMeta');
const RevertTraceModel = require('../models/RevertTrace');

class Prism extends BasicService {
    setConnector(connector) {
        this._connector = connector;
    }

    async start() {
        this._recentTransactions = new Set();
        this._currentBlockNum = 0;
        this._mainPrismController = new MainPrismController({ connector: this._connector });

        const lastBlock = await this._getLastBlockNum();
        const subscriber = new BlockSubscribe(lastBlock + 1);

        subscriber.on('block', this._handleBlock.bind(this));
        subscriber.on('fork', this._handleFork.bind(this));

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
}

module.exports = Prism;
