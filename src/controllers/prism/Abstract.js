class Abstract {
    async handle(data) {
        throw 'Handler not implemented';
    }

    async _getOrCreateModel(modelClass, queryForCheck) {
        let model = await this._getModel(modelClass, queryForCheck);

        if (!model) {
            model = new modelClass();
        }

        return model;
    }

    async _getModel(modelClass, query) {
        return await modelClass.findOne(query);
    }
}

module.exports = Abstract;
