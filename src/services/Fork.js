const core = require('gls-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const env = require('../data/env');
const ForkModel = require('../models/Fork');
const ServiceMetaModel = require('../models/ServiceMeta');

// TODO Register changes methods
class Fork extends BasicService {
    async start() {
        setInterval(async () => {
            await this._clean();
        }, env.GLS_FORK_CLEANER_INTERVAL);
    }

    async initBlock(blockNum) {
        await ForkModel.create({ blockNum });
    }

    async revert() {
        const documents = await ForkModel.find({}, {}, { sort: { _id: -1 }, lean: true });

        if (!documents) {
            Logger.warn('Empty fork data.');
            return;
        }

        for (let document of documents) {
            await this._restoreBy(document);
        }

        const lastBlockNum = documents[documents.length - 1].blockNum;

        await ServiceMetaModel.updateOne({}, { $set: { lastBlockNum } });
    }

    async _clean() {
        Logger.log('Start fork cleaner...');

        try {
            const currentLastBlock = await this._getCurrentLastBlock();

            if (currentLastBlock) {
                const edge = this._calcEdge(currentLastBlock);

                await this._clearOutdated(edge);
            }
        } catch (error) {
            Logger.error('Fork cleaner error:', error);
            process.exit(1);
        }

        Logger.log('Fork cleaning done!');
    }

    async _getCurrentLastBlock() {
        const latest = await ForkModel.findOne({}, { blockNum: 1 }, { sort: { blockNum: -1 } });

        if (!latest) {
            return null;
        }

        return latest.blockNum;
    }

    _calcEdge(currentLastBlock) {
        return currentLastBlock - env.GLS_DELEGATION_ROUND_LENGTH * 3;
    }

    async _clearOutdated(edge) {
        await ForkModel.deleteMany({ blockNum: { $lt: edge } });
    }

    async _restoreBy(document) {
        const stack = document.stack;
        let data;

        while ((data = stack.pop())) {
            const { type, className, documentId, data } = data;
            const Model = require(`../models/${className}`);

            switch (type) {
                case 'swap':
                    await this._swapDocumentBack(Model, documentId, data);
                    break;

                case 'update':
                    await this._restoreDocumentValues(Model, documentId, data);
                    break;

                case 'create':
                    await this._removeDocument(Model, documentId);
                    break;

                case 'remove':
                    await this._recreateDocument(Model, documentId, data);
                    break;
            }
        }

        await document.remove();
    }

    async _swapDocumentBack(Model, documentId, data) {
        await Model.updateOne({ _id: documentId }, data);
    }

    async _restoreDocumentValues(Model, documentId, data) {
        const queryData = this._makeSetQueryData(data);

        await Model.updateOne({ _id: documentId }, { $set: queryData });
    }

    _makeSetQueryData(data) {
        const result = {};

        for (const key of Object.keys(data)) {
            if (typeof data[key] === 'object') {
                const innerResult = this._makeSetQueryData(data[key]);

                for (const innerKey of Object.keys(innerResult)) {
                    result[`${key}.${innerKey}`] = innerResult[innerKey];
                }
            } else {
                result[key] = data[key];
            }
        }

        return result;
    }

    async _removeDocument(Model, documentId) {
        await Model.deleteOne({ _id: documentId });
    }

    async _recreateDocument(Model, documentId, data) {
        await Model.create({ _id: documentId, ...data });
    }
}

module.exports = Fork;
