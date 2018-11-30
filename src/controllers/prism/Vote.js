const Abstract = require('./Abstract');
const VoteModel = require('../../models/Vote');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');

class Vote extends Abstract {
    async handle({ voter: fromUser, author: toUser, permlink, weight }) {
        let model = await VoteModel.findOne({ fromUser, toUser, permlink });

        if (model) {
            await this._updateRevertTrace({
                command: 'swap',
                modelBody: model.toObject(),
                modelClassName: VoteModel.modelName,
            });
        } else {
            model = new VoteModel({ fromUser, toUser, permlink, weight });

            await this._updateRevertTrace({
                command: 'create',
                modelBody: model.toObject(),
                modelClassName: VoteModel.modelName,
            });

            await model.save();
        }

        const postModel = await PostModel.findOne({ author: toUser, permlink });

        if (postModel) {
            await this._updatePostByVote(model, postModel);
        } else {
            const commentModel = await CommentModel.findOne({ author: toUser, permlink });

            if (commentModel) {
                await this._updateCommentByVote(model, commentModel);
            }
        }
    }

    _updatePostByVote(model, postModel) {
        // TODO -
    }

    _updateCommentByVote(model, commentModel) {
        // TODO -
    }
}

module.exports = Vote;
