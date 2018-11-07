const Abstract = require('./Abstract');
const VoteModel = require('../../models/Vote');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');

class Vote extends Abstract {
    async handle({ voter: fromUser, author: toUser, permlink, weight }) {
        const model = new VoteModel({ fromUser, toUser, permlink, weight });

        await this._updateRevertTrace({ command: 'create', blockBody: model.toObject() });
        
        await model.save();

        const postModel = await PostModel.findOne({ permlink });

        if (postModel) {
            await this._updatePostByVote(model, postModel);
            return;
        }

        const commentModel = await CommentModel.findOne({ permlink });

        if (commentModel) {
            await this._updateCommentByVote(model, commentModel);
            return;
        }

        // TODO Next version
    }

    _updatePostByVote(model, postModel) {
        // TODO In MVP version
    }

    _updateCommentByVote(model, commentModel) {
        // TODO Next version
    }
}

module.exports = Vote;
