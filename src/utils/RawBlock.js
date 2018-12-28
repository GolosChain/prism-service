const core = require('gls-core-service');
const BlockUtils = core.utils.Block;
const HeaderModel = require('../models/RawBlockHeader');
const TransactionModel = require('../models/RawBlockTransaction');
const RealOperationModel = require('../models/RawBlockRealOperation');
const VirtualOperationModel = require('../models/RawBlockVirtualOperation');
const CorruptedModel = require('../models/RawBlockCorrupted');

class RawBlock {
    static async getFullBlock(blockNum) {
        const header = await HeaderModel.findOne({ blockNum });
        const transactions = await TransactionModel.find(
            { blockNum },
            {},
            { sort: { transactionNum: 1 } }
        );
        const virtualOperations = await VirtualOperationModel.find(
            { blockNum },
            {},
            { sort: { orderingNum: 1 } }
        );
        const fullBlock = header.toObject();

        fullBlock.transactions = [];

        for (const transactionModel of transactions) {
            const transactionObject = transactionModel.toObject();
            const operations = await RealOperationModel.find(
                { blockNum },
                {},
                { sort: { orderingNum: 1 } }
            );

            transactionObject.operations = operations.map(model => model.toObject());
        }

        fullBlock._virtual_operations = virtualOperations.map(model => model.toObject());

        return fullBlock;
    }

    static async removeFullBlock(blockNum) {
        await HeaderModel.deleteOne({ blockNum });

        await TransactionModel.deleteMany({ blockNum });
        await RealOperationModel.deleteMany({ blockNum });
        await VirtualOperationModel.deleteMany({ blockNum });
    }

    static async save(block, blockNum, withCheck = false) {
        if (withCheck && (await HeaderModel.findOne({ blockNum }))) {
            return;
        }

        await this._storeTransactions(block, blockNum);
        await this._storeVirtualOperations(block, blockNum);

        delete block.transactions;
        delete block._virtual_operations;

        const headerModel = new HeaderModel({ blockNum, ...block });

        await headerModel.save();
    }

    static async saveCorrupted(blockNum) {
        const corruptedModel = new CorruptedModel({ blockNum });

        await corruptedModel.save();
    }

    static async getCorruptedList() {
        return await CorruptedModel.find({});
    }

    static async getLastBlockNum() {
        const model = await HeaderModel.findOne(
            {},
            { blockNum: true, _id: false },
            { sort: { blockNum: -1 } }
        );

        if (model) {
            return model.blockNum;
        } else {
            return null;
        }
    }

    static async getLastDispersedBlockNum() {
        const model = await HeaderModel.findOne(
            { dispersed: true },
            { blockNum: true, _id: false },
            { sort: { blockNum: -1 } }
        );

        if (model) {
            return model.blockNum;
        } else {
            return 0;
        }
    }

    static async markDispersed(blockNum) {
        await HeaderModel.updateOne({ blockNum }, { dispersed: true });
    }

    static async _storeTransactions(block, blockNum) {
        let transactionNum = 0;

        for (const transaction of BlockUtils.eachTransaction(block)) {
            const operations = transaction.operations;

            delete transaction.operations;

            const transactionModel = new TransactionModel({
                blockNum,
                orderingNum: transactionNum,
                ...transaction,
            });

            await transactionModel.save();
            await this._storeRealOperations(operations, blockNum, transactionNum);

            transactionNum++;
        }
    }

    static async _storeRealOperations(operations, blockNum, transactionNum) {
        let realOperationNum = 0;

        for (let [type, data] of operations) {
            const realOperationModel = new RealOperationModel({
                blockNum,
                transactionNum,
                orderingNum: realOperationNum,
                operationType: type,
                ...data,
            });

            await realOperationModel.save();

            realOperationNum++;
        }
    }

    static async _storeVirtualOperations(block, blockNum) {
        let virtualOperationNum = 0;

        for (const [type, data] of BlockUtils.eachVirtualOperation(block)) {
            const virtualOperationModel = new VirtualOperationModel({
                blockNum,
                orderingNum: virtualOperationNum,
                operationType: type,
                ...data,
            });

            await virtualOperationModel.save();

            virtualOperationNum++;
        }
    }
}

module.exports = RawBlock;
