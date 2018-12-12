const Abstract = require('./Abstract');
const VoteModel = require('../../models/Vote');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const UserModel = require('../../models/User');
const PendingCalc = require('../../utils/VotePendingPayout');
const ContentScoring = require('../../utils/ContentScoring');

class Vote extends Abstract {
    constructor() {
        super(...arguments);

        this._contentScoring = new ContentScoring();
    }

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
        await this._applyPostVotes(voteModel, contentModel);
        await this._applyPostPayouts({ voteModel, isNewVote, contentModel, blockTime });
        await this._applyPostScoring(contentModel);
    }

    async _applyPostVotes(voteModel, contentModel) {
        const { fromUser, weight } = voteModel;

        contentModel.vote.likes = contentModel.vote.likes || {};
        contentModel.vote.dislikes = contentModel.vote.dislikes || {};

        if (weight.gt(0)) {
            contentModel.vote.likes[fromUser] = weight;
            delete contentModel.vote.dislikes[fromUser];
        } else if (weight.lt(0)) {
            contentModel.vote.dislikes[fromUser] = weight;
            delete contentModel.vote.likes[fromUser];
        } else {
            delete contentModel.vote.likes[fromUser];
            delete contentModel.vote.dislikes[fromUser];
        }

        contentModel.markModified('vote.likes');
        contentModel.markModified('vote.dislikes');
    }

    async _applyPostPayouts({ voteModel, isNewVote, contentModel, blockTime }) {
        const userModel = await UserModel.findOne({
            name: voteModel.toUser,
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

    async _applyPostScoring(model) {
        model.scoring.actual = this._contentScoring.calcActual(
            model.payout.netRshares,
            model.createdInBlockchain
        );
        model.scoring.popular = this._contentScoring.calcPopular(
            model.payout.netRshares,
            model.createdInBlockchain
        );

        await model.save();
    }

    async _updateCommentByVote() {
        // TODO Next version (not in MVP)
    }
}

module.exports = Vote;
