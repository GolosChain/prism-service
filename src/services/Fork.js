const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const ForkModel = require('../models/Fork');

class Fork extends BasicService {
    async initBlock({ blockNum, blockTime, sequence }) {
        await ForkModel.create({ blockNum, blockTime, blockSequence: sequence });
    }

    async registerChanges({ type, Model, documentId, data }) {
        const className = Model.modelName;

        data = this._packData(data || {});

        await ForkModel.findOneAndUpdate(
            {},
            { $push: { stack: { type, className, documentId, data } } },
            { sort: { blockNum: -1 } }
        );
    }

    async revert(subscriber, baseBlockNum) {
        Logger.info('Revert on fork...');

        const documents = await ForkModel.find(
            {
                blockNum: {
                    $gte: baseBlockNum,
                },
            },
            {},
            { sort: { blockNum: -1 } }
        );

        const newBase = documents.pop();

        if (!newBase || newBase.blockNum !== baseBlockNum) {
            Logger.error('Critical Error! Not found base block in the fork data!');
            process.exit(1);
        }

        for (const document of documents) {
            Logger.info(`Reverting block num: ${document.blockNum}`);
            await this._restoreBy(document.toObject());
            await document.remove();
        }

        await ForkModel.deleteMany({
            blockNum: {
                $gt: baseBlockNum,
            },
        });

        await subscriber.setLastBlockMetaData({
            lastBlockNum: newBase.blockNum,
            lastBlockSequence: newBase.blockSequence,
        });

        Logger.info('Revert on fork done!');
    }

    async registerIrreversibleBlock({ blockNum }) {
        try {
            // Удаляем все записи до неоткатного блока и блока до него,
            // Запись о неоткатном блоке сохраняем, чтобы можно было до него откатиться.
            await ForkModel.deleteMany({
                blockNum: {
                    $lt: blockNum - 1,
                },
            });
        } catch (err) {
            Logger.warn("Can't clear outdated fork data:", err);
        }
    }

    async revertLastBlock(subscriber) {
        Logger.info('Revert last block...');

        const [current, previous] = await ForkModel.find(
            {},
            {},
            { sort: { blockNum: -1 }, limit: 2 }
        );

        if (!current) {
            Logger.warn('Empty restore data.');
            return;
        }

        await this._restoreBy(current.toObject());
        await current.remove();

        if (!previous) {
            Logger.warn('No previous block, resetting block num to 0');
        }

        await subscriber.setLastBlockMetaData({
            lastBlockNum: (previous && previous.blockNum) || 0,
            lastBlockSequence: (previous && previous.blockSequence) || 0,
        });
    }

    async _restoreBy(document) {
        const stack = document.stack;
        let stackItem;

        while ((stackItem = stack.pop())) {
            const { type, className, documentId } = stackItem;
            const data = this._unpackData(stackItem.data || {});
            const Model = require(`../models/${className}`);

            switch (type) {
                case 'create':
                    await this._removeDocument(Model, documentId);
                    break;

                case 'update':
                    await this._restoreDocument(Model, documentId, data);
                    break;

                case 'remove':
                    await this._recreateDocument(Model, documentId, data);
                    break;
            }
        }
    }

    async _removeDocument(Model, documentId) {
        await Model.deleteOne({ _id: documentId });
    }

    async _restoreDocument(Model, documentId, data) {
        await Model.updateOne({ _id: documentId }, data);
    }

    async _recreateDocument(Model, documentId, data) {
        await Model.create({ _id: documentId, ...data });
    }

    _packData(data) {
        const specialKeys = [];

        for (const key of Object.keys(data)) {
            if (key.indexOf('$') === 0) {
                specialKeys.push(key);
            }

            if (data[key] && typeof data[key] === 'object') {
                this._packData(data[key]);
            }
        }

        for (const key of specialKeys) {
            data[`@${key}`] = data[key];

            delete data[key];
        }

        return data;
    }

    _unpackData(data) {
        const specialKeys = [];

        for (const key of Object.keys(data)) {
            if (key.indexOf('@$') === 0) {
                specialKeys.push(key);
            }

            if (data[key] && typeof data[key] === 'object') {
                this._unpackData(data[key]);
            }
        }

        for (const key of specialKeys) {
            data[key.slice(1)] = data[key];

            delete data[key];
        }

        return data;
    }
}

module.exports = Fork;
