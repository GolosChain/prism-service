const core = require('gls-core-service');
const BasicController = core.controllers.Basic;

class AbstractContent extends BasicController {
    async _tryApplyVotesForModels({ Model, modelObjects, currentUserId }) {
        for (const modelObject of modelObjects) {
            await this._tryApplyVotes({ Model, modelObject, currentUserId });
        }
    }

    async _tryApplyVotes({ Model, modelObject, currentUserId }) {
        const votes = modelObject.votes;

        if (currentUserId) {
            const { hasUpVote, hasDownVote } = await this._detectVotes(
                Model,
                modelObject.contentId,
                currentUserId
            );

            votes.hasUpVote = hasUpVote;
            votes.hasDownVote = hasDownVote;
        } else {
            votes.hasUpVote = false;
            votes.hasDownVote = false;
        }
    }

    async _detectVotes(Model, contentId, currentUserId) {
        const upVoteCount = await Model.count({ contentId, 'votes.upUserIds': currentUserId });
        const downVoteCount = await Model.count({ contentId, 'votes.downUserIds': currentUserId });

        return { hasUpVote: Boolean(upVoteCount), hasDownVote: Boolean(downVoteCount) };
    }
}

module.exports = AbstractContent;
