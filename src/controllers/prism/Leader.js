const { JsonRpc, Api } = require('cyberwayjs');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('text-encoding');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const env = require('../../data/env');
const Abstract = require('./Abstract');
const LeaderModel = require('../../models/Leader');
const ProfileModel = require('../../models/Profile');
const ProposalModel = require('../../models/Proposal');

class Leader extends Abstract {
    constructor(...args) {
        super(...args);

        const rpc = new JsonRpc(env.GLS_CYBERWAY_CONNECT, { fetch });

        this._api = new Api({
            rpc,
            signatureProvider: null,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
        });
    }

    async register({ witness: userId, url }, { communityId }) {
        const action = { $set: { communityId, userId, active: true } };

        if (typeof url === 'string') {
            action.url = url;
        }

        await this._updateLeaderWithUpsert(communityId, userId, action);
        await this._updateProfile(userId);
    }

    async unregister({ witness: userId }, { communityId }) {
        // TODO Fork log
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

        // TODO Fork log
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

        // TODO Fork log
        await model.save();
    }

    async _getLeaderModelForUpdate(communityId, userId) {
        return await LeaderModel.findOne({ communityId, userId }, { votes: true, rating: true });
    }

    async _updateLeaderWithUpsert(communityId, userId, action) {
        // TODO Fork log
        await LeaderModel.updateOne({ communityId, userId }, action, { upsert: true });
    }

    async _setActiveState(userId, communityId, active) {
        // TODO Fork log
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

        // TODO Fork log
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

    async handleNewProposal(proposal) {
        const { proposer, proposal_name: proposalId, trx } = proposal;

        if (trx.actions.length !== 1) {
            return;
        }

        const action = trx.actions[0];

        if (action.name !== 'setparams') {
            return;
        }

        const [communityId, type] = action.account.split('.');

        if (!['publish'].includes(type)) {
            return;
        }

        const expiration = new Date(trx.expiration + 'Z');
        const [{ data }] = await this._api.deserializeActions(trx.actions);

        // TODO Fork log
        const proposalModel = new ProposalModel({
            communityId,
            userId: proposer,
            proposalId,
            code: action.account,
            action: action.name,
            expiration: expiration,
            changes: data.params.map(([structureName, values]) => ({
                structureName,
                values,
            })),
        });

        await proposalModel.save();
    }
}

module.exports = Leader;
