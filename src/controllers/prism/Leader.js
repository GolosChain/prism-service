const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');
const LeaderModel = require('../../models/Leader');

class Leader extends Abstract {
    async register({ witness: userId, url }, { communityId }) {
        const action = { $set: { communityId, userId, active: true } };

        if (typeof url === 'string') {
            action.url = url;
        }

        await this._updateLeaderWithUpsert(communityId, userId, action);
    }

    async unregister({ witness: userId }, { communityId }) {
        const action = { $set: { communityId, userId, active: false } };

        await this._updateLeaderWithUpsert(communityId, userId, action);
    }

    async vote({ voter, witness: leader }, { communityId }) {
        const model = await this._getLeaderModelForVotes(communityId, leader);

        if (!model) {
            Logger.warn(`Unknown leader - ${leader}`);
        }

        model.votes.push(voter);
        model.votes = [...new Set(model.votes)];

        await model.save();
    }

    async unvote({ voter, witness: leader }, { communityId }) {
        const model = await this._getLeaderModelForVotes(communityId, leader);

        if (!model) {
            Logger.warn(`Unknown leader - ${leader}`);
        }

        model.votes = model.votes.filter(userId => userId !== voter);
        model.markModified('votes');

        await model.save();
    }

    async changeLeaderState() {
        // TODO -
    }

    async _getLeaderModelForVotes(communityId, userId) {
        return await LeaderModel.findOne({ communityId, userId }, { votes: true });
    }

    async _updateLeaderWithUpsert(communityId, userId, action) {
        await LeaderModel.updateOne({ communityId, userId }, action, { upsert: true });
    }
}

module.exports = Leader;
