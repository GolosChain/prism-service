const Abstract = require('./Abstract');
const Model = require('../../models/Vote');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');

class Vote extends Abstract {
    async handle({ voter: fromUser, author: toUser, permlink, weight }) {
        const model = new Model({ fromUser, toUser, permlink, weight });

        await model.save();

        const postModel = await PostModel.findOne({ permlink });

        if (postModel) {
            await this._updatePostByLike(model, postModel);
            return;
        }

        const commentModel = await CommentModel.findOne({ permlink });

        if (commentModel) {
            await this._updateCommentByLike(model, commentModel);
            return;
        }
    }

    _updatePostByLike(model, postModel) {
        // TODO -
    }

    _updateCommentByLike(model, commentModel) {
        // TODO -
    }
}

module.exports = Vote;
