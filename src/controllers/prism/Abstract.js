const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const RevertTrace = require('../../models/RevertTrace');

class Abstract extends BasicController {
    async _getOrCreateModelWithTrace(modelClass, queryForCheck, initData) {
        let model = await this._getModelWithoutTrace(modelClass, queryForCheck);

        if (model) {
            await this._updateRevertTrace({
                command: 'swap',
                modelBody: model.toObject(),
                modelClassName: modelClass.modelName,
            });
        } else {
            // TODO Fork log
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

        // TODO Fork log
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
