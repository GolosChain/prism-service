const { JsonRpc, Api } = require('cyberwayjs');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('text-encoding');
const core = require('gls-core-service');
const { cloneDeep } = require('lodash');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');
const env = require('../../data/env');
const LeaderModel = require('../../models/Leader');
const ProfileModel = require('../../models/Profile');
const ProposalModel = require('../../models/Proposal');

const SET_PARAMS = 'setparams';

const ALLOWED_CONTRACTS = {
    publish: [SET_PARAMS],
    ctrl: [SET_PARAMS],
    referral: [SET_PARAMS],
    emit: [SET_PARAMS],
    vesting: [SET_PARAMS],
    charge: ['setrestorer'],
};

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
        const action = { communityId, userId, active: true };

        if (typeof url === 'string') {
            action.url = url;
        }

        let previousModel = await LeaderModel.findOneAndUpdate(
            { communityId, userId },
            { $set: action }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: LeaderModel,
                documentId: previousModel._id,
                data: action,
            });
        } else {
            previousModel = await LeaderModel.create({ communityId, userId, ...action });

            await this.registerForkChanges({
                type: 'create',
                Model: LeaderModel,
                documentId: previousModel._id,
            });
        }

        await this._updateProfile(userId);
    }

    async unregister({ witness: userId }, { communityId }) {
        const previousModel = await LeaderModel.findOneAndDelete({ userId, communityId });

        if (!previousModel) {
            return;
        }

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
        const update = {
            $addToSet: { votes: voter },
        };

        if (events.length) {
            update.$set = {
                rating: this._extractLeaderRating(events),
            };
        }

        const previousModel = await LeaderModel.findOneAndUpdate(
            { communityId, userId: witness },
            update
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

        await this._reorderLeaders({ communityId });
    }

    async unvote({ voter, witness }, { communityId, events }) {
        const update = {
            $pull: { votes: voter },
        };

        if (events.length) {
            update.$set = { rating: this._extractLeaderRating(events) };
        }

        const previousModel = await LeaderModel.findOneAndUpdate(
            { communityId, userId: witness },
            update
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

        await this._reorderLeaders({ communityId });
    }

    async _setActiveState(userId, communityId, active) {
        const previousModel = await LeaderModel.findOneAndUpdate(
            { communityId, userId },
            { $set: { active } }
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
            { userId, active: true },
            { communityId: true },
            { lean: true }
        );
        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId },
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
                    leaderIn: previousModel.leaderIn.toObject(),
                },
            },
        });
    }

    /**
     * @param {string} proposer
     * @param {string} proposalId
     * @param {[{ actor: string, permission: string }]} requested
     * @param {Object} trx
     * @param {Date} blockTime
     */
    async handleNewProposal(
        { proposer, proposal_name: proposalId, requested, trx },
        { blockTime }
    ) {
        if (trx.actions.length !== 1) {
            return;
        }

        const action = trx.actions[0];
        const [communityId, type] = action.account.split('.');

        const allowedActions = ALLOWED_CONTRACTS[type];

        if (!allowedActions || !allowedActions.includes(action.name)) {
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
            blockTime,
            expiration,
            isExecuted: false,
            approves: requested.map(({ actor, permission }) => ({ userId: actor, permission })),
            ...this._extractProposalChanges(data, action.name),
        });
        const saved = await proposalModel.save();

        await this.registerForkChanges({
            type: 'create',
            Model: ProposalModel,
            documentId: saved._id,
        });
    }

    /**
     * @param {string} proposer
     * @param {string} proposalId
     * @param {{ actor: string, permission: string }} level
     * @returns {Promise<void>}
     */
    async handleProposalApprove({ proposer, proposal_name: proposalId, level }) {
        const proposal = await ProposalModel.findOne(
            {
                userId: proposer,
                proposalId,
            },
            {
                _id: true,
                approves: true,
            },
            {
                lean: true,
            }
        );

        if (!proposal) {
            Logger.warn(`Proposal (${proposer}/${proposalId}) not found.`);
            return;
        }

        const approvesUpdated = cloneDeep(proposal.approves);

        const approve = approvesUpdated.find(approve => approve.userId === level.actor);

        if (!approve) {
            Logger.warn(
                `Proposal (${proposer}/${proposalId})`,
                `approve by ${level.actor} not found in requested list (skipping).`
            );
            return;
        }

        approve.isSigned = true;

        await ProposalModel.updateOne(
            {
                userId: proposer,
                proposalId,
            },
            {
                $set: {
                    approves: approvesUpdated,
                },
            }
        );

        await this.registerForkChanges({
            type: 'update',
            Model: ProposalModel,
            documentId: proposal._id,
            data: {
                $set: {
                    approves: proposal.approves,
                },
            },
        });
    }

    async handleProposalExec(
        { proposer, proposal_name: proposalId, executer },
        { communityId, blockTime }
    ) {
        const prev = await ProposalModel.findOneAndUpdate(
            {
                communityId,
                proposer,
                proposalId,
            },
            {
                $set: {
                    executer,
                    isExecuted: true,
                    executedBlockTime: blockTime,
                },
            }
        );

        // Если такого пропозала не было, значит это был пропозл не настроек сообщества, ничего не делаем.
        if (!prev) {
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProposalModel,
            documentId: prev._id,
            data: {
                $set: {
                    executer: prev.executer,
                    isExecuted: prev.isExecuted,
                    executedBlockTime: prev.executedBlockTime,
                },
            },
        });
    }

    _extractProposalChanges(data, actionName) {
        if (actionName === SET_PARAMS) {
            return {
                changes: data.params.map(([structureName, values]) => ({
                    structureName,
                    values,
                })),
            };
        }

        return {
            data,
        };
    }

    async _reorderLeaders({ communityId }) {
        try {
            const leaders = await LeaderModel.find(
                { communityId },
                { _id: false, userId: true, position: true, rating: true },
                { sort: { rating: -1, userId: 1 }, lean: true }
            );

            for (let i = 0; i < leaders.length; i++) {
                const { userId, position, rating } = leaders[i];

                let updatedPosition;

                if (!rating || rating === '0') {
                    updatedPosition = null;
                } else {
                    updatedPosition = i;
                }

                if (position !== updatedPosition) {
                    await LeaderModel.updateOne({ userId }, { position: updatedPosition });
                }
            }
        } catch (err) {
            Logger.error('Leaders reordering failed:', err);
        }
    }
}

module.exports = Leader;
