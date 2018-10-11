const Abstract = require('./Abstract');
const Model = require('../../models/Post');

class Post extends Abstract {
    async handle(data) {
        if (data.parent_author) {
            return;
        }

        const model = await this._getOrCreateModel(Model, { permlink: data.permlink });

        this._applyBasicData(model, data);
        this._applyMetaData(model, data);
        
        await model.save();
    }

    _applyBasicData(model, data) {
        model.parentPermlink = data.parent_permlink;
        model.author = data.author;
        model.permlink = data.permlink;
        model.body = data.body;
        model.rawJsonMetadata = data.json_metadata;
        model.title = data.title;
    }

    _applyMetaData(model, data) {
        let metadata;

        try {
            metadata = JSON.parse(data.json_metadata);

            if (!metadata || Array.isArray(metadata)) {
                metadata = {};
            }
        } catch (error) {
            // do nothing, invalid metadata or another client
            return;
        }

        model.metadata.app = metadata.app;
        model.metadata.format = metadata.format || metadata.editor;
        model.metadata.tags = metadata.tags;
        model.metadata.images = metadata.image;
        model.metadata.links = metadata.links;
        model.metadata.users = metadata.users;

        if (model.metadata.images && model.metadata.images[0] === '') {
            model.metadata.images = [];
        }
    }
}

module.exports = Post;
