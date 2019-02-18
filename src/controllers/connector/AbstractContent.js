const core = require('gls-core-service');
const BasicController = core.controllers.Basic;

class AbstractContent extends BasicController {
    _tryApplyVotes({ Model, modelObject, currentUserId }) {
        if (currentUserId) {
            const { hasUpVote, hasDownVote } = this._detectVotes(
                Model,
                modelObject.id,
                currentUserId
            );

            modelObject.votes.hasUpVote = hasUpVote;
            modelObject.votes.hasDownVote = hasDownVote;
        }
    }

    _detectVotes(Model, contentId, userId) {
        const hasUpVote = false;
        const hasDownVote = false;

        // TODO -

        return { hasUpVote, hasDownVote };
    }
}

module.exports = AbstractContent;
