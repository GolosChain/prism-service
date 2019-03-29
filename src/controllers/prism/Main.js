const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Post = require('./Post');
const Comment = require('./Comment');
const Profile = require('./Profile');
const Vote = require('./Vote');
const Subscribe = require('./Subscribe');
const HashTag = require('./HashTag');

// TODO Change after MVP
const communityRegistry = ['gls.publish', 'gls.social', 'gls.vesting', 'cyber'];

class Main {
    constructor({ connector }) {
        this._post = new Post({ connector });
        this._comment = new Comment({ connector });
        this._profile = new Profile({ connector });
        this._vote = new Vote({ connector });
        this._subscribe = new Subscribe({ connector });
        this._hashTag = new HashTag({ connector });
    }

    async disperse({ transactions, blockNum, blockTime }) {
        for (const transaction of transactions) {
            let previous = null;

            for (const action of transaction.actions) {
                await this._disperseAction(action, previous, { blockNum, blockTime });
                previous = action;
            }
        }
    }

    async _disperseAction(action, previous, { blockNum, blockTime }) {
        if (!action) {
            Logger.error('Empty transaction! But continue.');
            return;
        }

        if (!communityRegistry.includes(action.receiver)) {
            return;
        }

        const pathName = [action.code, action.action].join('->');
        const communityId = this._extractCommunityId(action);

        switch (pathName) {
            case 'gls.publish->createmssg':
                // Warning - do not change ordering
                await this._post.handleCreate(action, { communityId, blockTime });
                await this._hashTag.handleCreate(action, { communityId });
                await this._comment.handleCreate(action, { communityId, blockTime });
                break;

            case 'gls.publish->updatemssg':
                // Warning - do not change ordering
                await this._hashTag.handleUpdate(action, { communityId });
                await this._post.handleUpdate(action);
                await this._comment.handleUpdate(action);
                break;

            case 'gls.publish->deletemssg':
                // Warning - do not change ordering
                await this._hashTag.handleDelete(action, { communityId });
                await this._post.handleDelete(action);
                await this._comment.handleDelete(action);
                break;

            case 'cyber->newaccount':
                await this._profile.handleCreate(action, { blockTime });
                break;

            case 'gls.social->updatemeta':
                await this._profile.handleMeta(action);
                break;

            case 'gls.social->changereput':
                await this._vote.handleReputation(action, previous);
                break;

            case 'gls.publish->upvote':
                await this._vote.handleUpVote(action);
                break;

            case 'gls.publish->downvote':
                await this._vote.handleDownVote(action);
                break;

            case 'gls.publish->unvote':
                await this._vote.handleUnVote(action);
                break;

            case 'gls.social->pin':
                await this._subscribe.pin(action);
                break;

            case 'gls.social->unpin':
                await this._subscribe.unpin(action);
                break;

            default:
            // unknown transaction, do nothing
        }
    }

    _extractCommunityId(transaction) {
        const calledCodeName = transaction.code;

        return calledCodeName.split('.')[0];
    }
}

module.exports = Main;
