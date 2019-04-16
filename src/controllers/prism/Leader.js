const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');
const LeaderModel = require('../../models/Leader');

class Leader extends Abstract {
    async register({ witness: userId, url }, { communityId }) {
        // TODO -
    }

    async unregister({ witness: userId }, { communityId }) {
        // TODO -
    }

    async vote({ voter, witness: leader }, { communityId }) {
        // TODO -

        return;

        const model = await this._getLeaderModelForVotes(communityId, leader);

        model.votes.push(voter);
        model.votes = [...new Set(model.votes)];

        // TODO -

        await model.save();
    }

    async unvote({ voter, witness: leader }, { communityId }) {
        // TODO -

        return;

        const model = await this._getLeaderModelForVotes(communityId, leader);

        model.votes = model.filter(userId => userId !== voter);
        model.markModified('votes');

        // TODO -

        await model.save();
    }

    async _getLeaderModelForVotes(communityId, userId) {
        return await LeaderModel.findOne({ communityId, userId }, { votes: true });
    }
}

module.exports = Leader;
