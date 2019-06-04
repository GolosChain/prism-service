const core = require('gls-core-service');
const Logger = core.utils.Logger;
const RevertTrace = require('../models/RevertTrace');

class ForkRestore {
    async revert() {
        const documents = await RevertTrace.find({}, {}, { sort: { _id: -1 }, lean: true });

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

module.exports = ForkRestore;
