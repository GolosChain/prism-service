const AbstractComment = require('./AbstractComment');
const Model = require('../../models/Post');

class Post extends AbstractComment {
    async handle(data) {
        await super.handle(data, Model);
    }

    _isInvalid(data) {
        return !!data.parent_author;
    }

    _applyBasicData(model, data) {
        super._applyBasicData(model, data);

        model.title = data.title;
    }
}

module.exports = Post;
