const core = require('gls-core-service');
const Logger = core.utils.Logger;
const ForkModel = require('../models/Fork');
const BasicService = core.services.Basic;
const env = require('../data/env');

class Fork extends BasicService {
    async start() {
        setInterval(async () => {
            await this._clean();
        }, env.GLS_REVERT_TRACE_CLEANER_INTERVAL);
    }

    async initBlock(blockNum) {
        await ForkModel.create({ blockNum });
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

    async revert() {
        const documents = await ForkModel.find({}, {}, { sort: { _id: -1 }, lean: true });

        if (!documents) {
            Logger.warn('Empty fork data.');
            return;
        }

        for (let document of documents) {
            await this._handleDocument(document);
        }

        // TODO Update last block num
    }

    async _handleDocument(document) {
        const stack = document.stack;
        let data;

        while ((data = stack.pop())) {
            const { type, className, data } = data;
            const Model = require(`../models/${className}`);

            // TODO -
            switch (type) {
            }
        }

        await document.remove();
    }
}

module.exports = Fork;
