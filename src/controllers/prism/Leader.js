const { JsonRpc, Api } = require('cyberwayjs');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('text-encoding');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');
const env = require('../../data/env');
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
        const previousModel = await LeaderModel.remove({
            userId,
            communityId,
        });

        await this.registerForkChanges({
            type: 'remove',
            Model: LeaderModel,
            documentId: previousModel._id,
            data: previousModel.toObject(),
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

    async vote({ voter, witness }, { communityId, events }) {
        const previousModel = await LeaderModel.findOneAndUpdate(
            { communityId, userId: witness },
            {
                $addToSet: { votes: voter },
                $set: { rating: this._extractLeaderRating(events) },
            }
        );

        if (!previousModel) {
            Logger.warn(`Unknown leader - ${witness}`);
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: LeaderModel,
            documentId: previousModel._id,
            data: {
                $pull: { votes: voter },
                $set: { rating: previousModel.rating },
            },
        });
    }

    async unvote({ voter, witness }, { communityId, events }) {
        const previousModel = await LeaderModel.findOneAndUpdate(
            { communityId, userId: witness },
            {
                $pull: { votes: voter },
                $set: { rating: this._extractLeaderRating(events) },
            }
        );

        if (!previousModel) {
            Logger.warn(`Unknown leader - ${witness}`);
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: LeaderModel,
            documentId: previousModel._id,
            data: {
                $addToSet: { votes: voter },
                $set: { rating: previousModel.rating },
            },
        });
    }

    async _getLeaderModelForUpdate(communityId, userId) {
        return await LeaderModel.findOne({ communityId, userId }, { votes: true, rating: true });
    }

    async _updateLeaderWithUpsert(communityId, userId, action) {
        const previousModel = await LeaderModel.findOneAndUpdate({ communityId, userId }, action, {
            upsert: true,
        });

        await this.registerForkChanges({
            type: 'update',
            Model: LeaderModel,
            documentId: previousModel._id,
            data: action,
        });
    }

    async _setActiveState(userId, communityId, active) {
        const previousModel = await LeaderModel.findOneAndUpdate(
            { communityId, userId },
            {
                $set: {
                    active,
                },
            }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: LeaderModel,
                documentId: previousModel._id,
                data: {
                    $set: {
                        active: !active,
                    },
                },
            });
        }
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

        const previousModel = await ProfileModel.findOneAndUpdate(
            {
                userId,
            },
            {
                $set: {
                    leaderIn: communities.map(community => community.communityId),
                },
            }
        );

        if (!previousModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProfileModel,
            documentId: previousModel._id,
            data: {
                $set: {
                    leaderIn: previousModel.leaderIn,
                },
            },
        });
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
        const saved = await proposalModel.save();

        await this.registerForkChanges({
            type: 'create',
            Model: ProposalModel,
            documentId: saved._id,
        });
    }
}

module.exports = Leader;
