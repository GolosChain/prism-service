const RevertTrace = require('../models/RevertTrace');

class ForkRestore {
    async revert() {
        const documents = await RevertTrace.find({}, {}, { sort: { _id: -1 } });

        if (!documents) {
            return;
        }

        for (let document of documents) {
            await this._handleDocument(document);
        }
    }

    async _handleDocument(document) {
        let stackFormEnd = document.stack.slice().reverse();

        for (let { command, modelBody, modelClassName } of stackFormEnd) {
            switch (command) {
                case 'create':
                    await this._delete(modelClassName, modelBody);
                    break;
                case 'swap':
                    await this._swapBack(modelClassName, modelBody);
                    break;
            }
        }

        await document.remove();
    }

    async _delete(name, body) {
        const Model = this._getModelClass(name);

        await Model.deleteOne({ _id: body._id });
    }

    async _swapBack(name, body) {
        const Model = this._getModelClass(name);

        await Model.updateOne({ _id: body._id }, body);
    }

    _getModelClass(name) {
        return new require(`../models/${name}`);
    }
}

module.exports = ForkRestore;
