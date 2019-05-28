const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');
const LeaderModel = require('../../models/Leader');
const ProfileModel = require('../../models/Profile');

class Leader extends Abstract {
    async register({ witness: userId, url }, { communityId }) {
        const action = { $set: { communityId, userId, active: true } };

        if (typeof url === 'string') {
            action.url = url;
        }

        await this._updateLeaderWithUpsert(communityId, userId, action);
        await this._updateProfile(userId);
    }

    async unregister({ witness: userId }, { communityId }) {
        await LeaderModel.remove({
            userId,
            communityId,
        });

        await this._updateProfile(userId);
    }

    async activate({ witness: userId }, { communityId }) {
        await this._setActiveState(userId, communityId, true);
        await this._updateProfile(userId);
    }

    async deactivate({ witness: userId }, { communityId }) {
        await this._setActiveState(userId, communityId, false);
        await this._updateProfile(userId);
    }

    async vote({ voter, witness: leader }, { communityId, events }) {
        const model = await this._getLeaderModelForUpdate(communityId, leader);

        if (!model) {
            Logger.warn(`Unknown leader - ${leader}`);
        }

        model.votes = model.votes || [];
        model.votes.push(voter);
        model.votes = [...new Set(model.votes)];
        model.rating = this._extractLeaderRating(events);

        await model.save();
    }

    async unvote({ voter, witness: leader }, { communityId, events }) {
        const model = await this._getLeaderModelForUpdate(communityId, leader);

        if (!model) {
            Logger.warn(`Unknown leader - ${leader}`);
        }

        model.votes = model.votes.filter(userId => userId !== voter);
        model.rating = this._extractLeaderRating(events);
        model.markModified('votes');

        await model.save();
    }

    async _getLeaderModelForUpdate(communityId, userId) {
        return await LeaderModel.findOne({ communityId, userId }, { votes: true, rating: true });
    }

    async _updateLeaderWithUpsert(communityId, userId, action) {
        await LeaderModel.updateOne({ communityId, userId }, action, { upsert: true });
    }

    async _setActiveState(userId, communityId, active) {
        await LeaderModel.updateOne(
            { communityId, userId },
            {
                $set: {
                    active,
                },
            }
        );
    }

    _extractLeaderRating(events) {
        return events[0].args.weight;
    }

    async _updateProfile(userId) {
        const communities = await LeaderModel.find(
            {
                userId,
                active: true,
            },
            {
                communityId: true,
            },
            {
                lean: true,
            }
        );

        await ProfileModel.updateOne(
            {
                userId,
            },
            {
                $set: {
                    leaderIn: communities.map(community => community.communityId),
                },
            }
        );
    }
}

module.exports = Leader;
