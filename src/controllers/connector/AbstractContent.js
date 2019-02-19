const core = require('gls-core-service');
const BasicController = core.controllers.Basic;

class AbstractContent extends BasicController {
    async _tryApplyVotesForModels({ Model, models, currentUserId }) {
        for (const modelObject of models) {
            await this._tryApplyVotes({ Model, modelObject, currentUserId });
        }
    }

    async _tryApplyVotes({ Model, modelObject, currentUserId }) {
        if (currentUserId) {
            const { hasUpVote, hasDownVote } = await this._detectVotes(
                Model,
                modelObject.contentId,
                currentUserId
            );

            modelObject.votes.hasUpVote = hasUpVote;
            modelObject.votes.hasDownVote = hasDownVote;
        }
    }

    async _detectVotes(Model, contentId, currentUserId) {
        const upVoteCount = await Model.count({
            contentId: contentId,
            votes: { upUserIds: currentUserId },
        });
        const downVoteCount = await Model.count({
            contentId: contentId,
            votes: { downUserIds: currentUserId },
        });

        return { hasUpVote: Boolean(upVoteCount), hasDownVote: Boolean(downVoteCount) };
    }
}

module.exports = AbstractContent;
