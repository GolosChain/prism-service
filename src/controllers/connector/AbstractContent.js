const core = require('gls-core-service');
const BasicController = core.controllers.Basic;

class AbstractContent extends BasicController {
    _detectVotes(Model, contentId, userId) {
        const hasUpVote = false;
        const hasDownVote = false;

        // TODO -

        return { hasUpVote, hasDownVote };
    }
}

module.exports = AbstractContent;
