const Abstract = require('./Abstract');
const Model = require('../../models/Comment');

class Comment extends Abstract {
    async handle(data) {
        if (!data.parent_author) {
            return;
        }

        const model = await this._getOrCreateModel(Model, { permlink: data.permlink });

        this._applyBasicData(model, data);
        this._applyMetaData(model, data);

        await model.save();
        await this._incrementPostComments(model);
    }

    _applyBasicData(model, data) {
        model.parentPermlink = data.parent_permlink;
        model.author = data.author;
        model.permlink = data.permlink;
        model.body = data.body;
        model.rawJsonMetadata = data.json_metadata;
        model.parentAuthor = data.parent_author;
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

    async _incrementPostComments(model) {
        await Model.updateOne({ _id: model._id }, { $inc: { commentsCount: 1 } });
    }
}

module.exports = Comment;
