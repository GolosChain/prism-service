const RevertTrace = require('../../models/RevertTrace');

class Abstract {
    async _getOrCreateModelWithTrace(modelClass, queryForCheck, initData) {
        let model = await this._getModelWithoutTrace(modelClass, queryForCheck);

        if (model) {
            await this._updateRevertTrace({
                command: 'swap',
                modelBody: model.toObject(),
                modelClassName: modelClass.modelName,
            });
        } else {
            model = new modelClass(initData);

            await model.save();

            await this._updateRevertTrace({
                command: 'create',
                modelBody: model.toObject(),
                modelClassName: modelClass.modelName,
            });
        }

        return model;
    }

    async _getModelWithoutTrace(modelClass, query) {
        return await modelClass.findOne(query);
    }

    async _updateRevertTrace({ command, modelBody, modelClassName }) {
        const model = await RevertTrace.findOne(
            {},
            {
                _id: 1,
            },
            {
                sort: {
                    _id: -1,
                },
            }
        );

        await RevertTrace.updateOne(
            {
                _id: model._id,
            },
            {
                $push: {
                    stack: { command, modelBody, modelClassName },
                },
            }
        );
    }
}

module.exports = Abstract;
