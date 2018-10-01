const Abstract = require('./Abstract');
const Model = require('../../models/Post');

class Post extends Abstract {
    async handle(data) {
        if (data.parent_author) {
            // this is a comment
            return;
        }

        let model = await Model.findOne({ permlink: data.permlink });

        if (!model) {
            model = new Model();
        }

        this._applyBasicData(model, data);
        this._applyMetaData(model, data);

        await model.save();
    }

    _applyBasicData(model, data) {
        model.parentPermlink = data.parent_permlink;
        model.author = data.author;
        model.permlink = data.permlink;
        model.title = data.title;
        model.body = data.body;
        model.rawJsonMetadata = data.json_metadata;
    }

    _applyMetaData(model, data) {
        let metadata;

        try {
            metadata = JSON.parse(data.json_metadata);
        } catch (error) {
            // do nothing, invalid metadata or another client
            return;
        }

        model.appType = metadata.app;
        model.format = metadata.format || metadata.editor;
        model.tags = metadata.tags || [];
        model.images = metadata.images || [];
        model.links = metadata.links || [];

        if (model.images[0] === '') {
            model.images = [];
        }
    }
}

module.exports = Post;
