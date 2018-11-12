const RevertTrace = require('../../models/RevertTrace');

class Abstract {
    async handle(data) {
        throw 'Handler not implemented';
    }

    async _getOrCreateModelWithTrace(modelClass, queryForCheck) {
        let model = await this._getModelWithoutTrace(modelClass, queryForCheck);

        if (model) {
            await this._updateRevertTrace({
                command: 'swap',
                blockBody: model.toObject(),
            });
        } else {
            model = new modelClass();

            await this._updateRevertTrace({
                command: 'create',
                blockBody: model.toObject(),
            });
        }

        return model;
    }

    async _getModelWithoutTrace(modelClass, query) {
        return await modelClass.findOne(query);
    }

    async _updateRevertTrace(data) {
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
                    stack: data,
                },
            }
        );
    }
}

module.exports = Abstract;
