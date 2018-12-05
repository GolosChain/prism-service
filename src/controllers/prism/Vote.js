const Abstract = require('./Abstract');
const VoteModel = require('../../models/Vote');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const UserModel = require('../../models/User');
const PendingCalc = require('../../utils/VotePendingPayout');

class Vote extends Abstract {
    async handle({ voter: fromUser, author: toUser, permlink, weight }, { blockTime }) {
        let model = await VoteModel.findOne({ fromUser, toUser, permlink });
        let isNewVote;

        if (model) {
            isNewVote = false;

            await this._updateRevertTrace({
                command: 'swap',
                modelBody: model.toObject(),
                modelClassName: VoteModel.modelName,
            });
        } else {
            isNewVote = true;
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
            await this._updatePostByVote({
                isNewVote,
                voteModel: model,
                contentModel: postModel,
                blockTime,
            });
        } else {
            const commentModel = await CommentModel.findOne({ author: toUser, permlink });

            if (commentModel) {
                await this._updateCommentByVote();
            }
        }
    }

    async _updatePostByVote({ voteModel, isNewVote, contentModel, blockTime }) {
        const userModel = await UserModel.findOne({
            name: voteModel.toUser
        });
        let recentVoteModel;

        if (!userModel) {
            return;
        }

        if (isNewVote) {
            recentVoteModel = null;
        } else {
            recentVoteModel = voteModel.toObject();
        }

        const calculation = new PendingCalc(
            {
                voteModel,
                recentVoteModel,
                contentModel,
                userModel,
            },
            await this._chainPropsService.getCurrentValues(),
            blockTime
        );

        await calculation.calcAndApply();
    }

    async _updateCommentByVote() {
        // TODO Next version (not in MVP)
    }
}

module.exports = Vote;
