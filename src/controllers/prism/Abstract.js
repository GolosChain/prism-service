class Abstract {
    async handle(data) {
        throw 'Handler not implemented';
    }

    async _getOrCreateModel(modelClass, queryForCheck) {
        let model = await modelClass.findOne(queryForCheck);

        if (!model) {
            model = new modelClass();
        }

        return model;
    }
}

module.exports = Abstract;
