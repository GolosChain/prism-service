const core = require('gls-core-service');
const { Logger, metrics } = core.utils;
const Post = require('./Post');
const Comment = require('./Comment');
const Profile = require('./Profile');
const Vote = require('./Vote');
const Subscribe = require('./Subscribe');
const HashTag = require('./HashTag');
const Leader = require('./Leader');
const CommunitySettings = require('./CommunitySettings');

const ACTION_PROCESSING_WARNING_LIMIT = 1000;

// TODO Change after MVP
const communityRegistry = [
    'gls.publish',
    'gls.social',
    'gls.vesting',
    'gls.ctrl',
    'gls.charge',
    'cyber',
    'cyber.domain',
    'cyber.token',
    'cyber.msig',
];

class Main {
    constructor({ connector, forkService }) {
        this._post = new Post({ connector, forkService });
        this._comment = new Comment({ connector, forkService });
        this._profile = new Profile({ connector, forkService });
        this._vote = new Vote({ connector, forkService });
        this._subscribe = new Subscribe({ connector, forkService });
        this._hashTag = new HashTag({ connector, forkService });
        this._leader = new Leader({ connector, forkService });
        this._communitySettings = new CommunitySettings({ connector, forkService });
    }

    async disperse({ transactions, blockNum, blockTime }) {
        const end = metrics.startTimer('block_dispersing_time');

        for (const transaction of transactions) {
            let previous;

            if (!transaction || !transaction.actions) {
                return;
            }

            for (const action of transaction.actions) {
                const start = Date.now();
                await this._disperseAction(action, previous, { blockNum, blockTime });
                const delta = Date.now() - start;

                if (delta > ACTION_PROCESSING_WARNING_LIMIT) {
                    Logger.warn(
                        `Slow transaction action processing (>${ACTION_PROCESSING_WARNING_LIMIT}ms),`,
                        `blockNum: ${blockNum}, trxId: ${transaction.id},`,
                        `action: ${action.code}->${action.action}`
                    );
                }
                previous = action;
            }
        }

        end();
    }

    async _disperseAction(action, previous = { args: {} }, { blockTime }) {
        if (!action) {
            Logger.error('Empty transaction! But continue.');
            return;
        }

        if (!communityRegistry.includes(action.receiver)) {
            return;
        }

        const pathName = [action.code, action.action].join('->');
        const communityId = this._extractCommunityId(action);
        const actionArgs = action.args;
        const events = action.events;

        switch (pathName) {
            case `${communityId}.charge->use`:
                await this._profile.handleChargeState(events);
                break;

            case `cyber->newaccount`:
                await this._profile.handleCreate(actionArgs, { blockTime });
                break;

            case `cyber.domain->newusername`:
                await this._profile.handleUsername(actionArgs);
                break;

            case `${communityId}.publish->paymssgrwrd`:
                await this._post.handlePayout(actionArgs, { events });
                break;

            case `${communityId}.publish->createmssg`:
                // Warning - do not change ordering
                await this._post.handleCreate(actionArgs, { communityId, blockTime });
                await this._hashTag.handleCreate(actionArgs, { communityId });
                await this._comment.handleCreate(actionArgs, { communityId, blockTime });
                break;

            case `${communityId}.publish->updatemssg`:
                // Warning - do not change ordering
                await this._hashTag.handleUpdate(actionArgs, { communityId });
                await this._post.handleUpdate(actionArgs);
                await this._comment.handleUpdate(actionArgs);
                break;

            case `${communityId}.publish->deletemssg`:
                // Warning - do not change ordering
                await this._hashTag.handleDelete(actionArgs, { communityId });
                await this._post.handleDelete(actionArgs);
                await this._comment.handleDelete(actionArgs);
                break;

            case `${communityId}.social->updatemeta`:
                await this._profile.handleMeta(actionArgs);
                break;

            case `${communityId}.publish->upvote`:
                await this._vote.handleUpVote(actionArgs, { communityId, events });
                break;

            case `${communityId}.publish->downvote`:
                await this._vote.handleDownVote(actionArgs, { communityId, events });
                break;

            case `${communityId}.publish->unvote`:
                await this._vote.handleUnVote(actionArgs, { communityId, events });
                break;

            case `${communityId}.social->pin`:
                await this._subscribe.pin(actionArgs);
                break;

            case `${communityId}.social->unpin`:
                await this._subscribe.unpin(actionArgs);
                break;

            case `${communityId}.ctrl->regwitness`:
                await this._leader.register(actionArgs, { communityId });
                break;

            case `${communityId}.ctrl->unregwitness`:
                await this._leader.unregister(actionArgs, { communityId });
                break;

            case `${communityId}.ctrl->startwitness`:
                await this._leader.activate(actionArgs, { communityId });
                break;

            case `${communityId}.ctrl->stopwitness`:
                await this._leader.deactivate(actionArgs, { communityId });
                break;

            case `${communityId}.ctrl->votewitness`:
                await this._leader.vote(actionArgs, { communityId, events });
                break;

            case `${communityId}.ctrl->unvotewitn`:
                await this._leader.unvote(actionArgs, { communityId, events });
                break;

            case `${communityId}.publish->reblog`:
                await this._post.handleRepost(actionArgs, { communityId, blockTime });
                break;

            case `${communityId}.publish->erasereblog`:
                await this._post.handleRemoveRepost(actionArgs, { communityId, blockTime });
                break;

            case `${communityId}.vesting->open`:
                await this._profile.handleVestingOpening(actionArgs);
                break;

            case 'cyber.msig->propose':
                await this._leader.handleNewProposal(actionArgs, { blockTime });
                break;

            case 'cyber.msig->approve':
                await this._leader.handleProposalApprove(actionArgs);
                break;

            case 'cyber.msig->exec':
                await this._leader.handleProposalExec(actionArgs, { blockTime });
                break;

            case `${communityId}.charge->setrestorer`:
                try {
                    await this._communitySettings.handleSetParams(
                        communityId,
                        'charge',
                        'setrestorer',
                        [[null, actionArgs.params]]
                    );
                } catch (err) {
                    Logger.error("Community Settings 'charge::setrestorer' processing failed", err);
                }
                break;

            case `${communityId}.publish->setrules`:
                try {
                    await this._communitySettings.handleSetParams(
                        communityId,
                        'publish',
                        'setrules',
                        [[null, actionArgs.params]]
                    );
                } catch (err) {
                    Logger.error("Community Settings 'publish::setrules' processing failed", err);
                }
                break;

            default:
            // unknown action, do nothing
        }

        if (action.action === 'setparams') {
            const [communityId, contractName] = action.code.split('.');

            if (contractName) {
                await this._communitySettings.handleSetParams(
                    communityId,
                    contractName,
                    'setparams',
                    actionArgs.params
                );
            }
        }
    }

    _extractCommunityId(action) {
        const calledCodeName = action.code;

        return calledCodeName.split('.')[0];
    }
}

module.exports = Main;
