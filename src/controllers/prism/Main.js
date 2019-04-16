const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Post = require('./Post');
const Comment = require('./Comment');
const Profile = require('./Profile');
const Vote = require('./Vote');
const Subscribe = require('./Subscribe');
const HashTag = require('./HashTag');
const Leader = require('./Leader');

// TODO Change after MVP
const communityRegistry = ['gls.publish', 'gls.social', 'gls.vesting', 'gls.ctrl', 'cyber'];

class Main {
    constructor({ connector }) {
        this._post = new Post({ connector });
        this._comment = new Comment({ connector });
        this._profile = new Profile({ connector });
        this._vote = new Vote({ connector });
        this._subscribe = new Subscribe({ connector });
        this._hashTag = new HashTag({ connector });
        this._leader = new Leader({ connector });
    }

    async disperse({ transactions, blockNum, blockTime }) {
        for (const transaction of transactions) {
            let previous;

            for (const action of transaction.actions) {
                await this._disperseAction(action, previous, { blockNum, blockTime });
                previous = action;
            }
        }
    }

    async _disperseAction(action, previous = { args: {} }, { blockNum, blockTime }) {
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
        const previousArgs = previous.args;

        switch (pathName) {
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

            case `cyber->newaccount`:
                await this._profile.handleCreate(actionArgs, { blockTime });
                break;

            case `${communityId}.social->updatemeta`:
                await this._profile.handleMeta(actionArgs);
                break;

            case `${communityId}.social->changereput`:
                await this._vote.handleReputation(actionArgs, previousArgs);
                break;

            case `${communityId}.publish->upvote`:
                await this._vote.handleUpVote(actionArgs);
                break;

            case `${communityId}.publish->downvote`:
                await this._vote.handleDownVote(actionArgs);
                break;

            case `${communityId}.publish->unvote`:
                await this._vote.handleUnVote(actionArgs);
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

            case `${communityId}.ctrl->votewitness`:
                await this._leader.vote(actionArgs, { communityId });
                break;

            case `${communityId}.ctrl->unvotewitn`:
                await this._leader.unvote(actionArgs, { communityId });
                break;

            default:
            // unknown action, do nothing
        }
    }

    _extractCommunityId(action) {
        const calledCodeName = action.code;

        return calledCodeName.split('.')[0];
    }
}

module.exports = Main;
