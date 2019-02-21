const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Post = require('./Post');
const Comment = require('./Comment');
const Profile = require('./Profile');
const Vote = require('./Vote');

// TODO Change after MVP
const communityRegistry = ['gls.publish', 'gls.social', 'gls.vesting', 'cyber'];

class Main {
    constructor() {
        this._post = new Post();
        this._comment = new Comment();
        this._profile = new Profile();
        this._vote = new Vote();
    }

    async disperse({ transactions, blockNum, blockTime }) {
        for (const transaction of transactions) {
            await this._disperseTransaction(transaction, { blockNum, blockTime });
        }
    }

    async _disperseTransaction(transaction, { blockNum, blockTime }) {
        if (!transaction) {
            Logger.error('Empty transaction! But continue.');
            return;
        }

        if (!communityRegistry.includes(transaction.receiver)) {
            return;
        }

        const pathName = [transaction.code, transaction.action].join('->');
        const communityId = this._extractCommunityId(transaction);

        console.log(pathName);

        switch (pathName) {
            case 'gls.publish->createmssg':
                await this._post.handleCreate(transaction, { communityId, blockTime });
                //await this._comment.handleCreate(transaction, blockNum);
                break;

            case 'gls.publish->updatemssg':
                await this._post.handleUpdate(transaction, blockNum);
                //await this._comment.handleUpdate(transaction, blockNum);
                break;

            case 'gls.publish->deletemssg':
                await this._post.handleDelete(transaction, blockNum);
                //await this._comment.handleDelete(transaction, blockNum);
                break;

            case 'cyber->newaccount':
                await this._profile.handleCreate(transaction, { blockTime });
                break;

            case 'gls.social->updatemeta':
                await this._profile.handleMeta(transaction);
                break;

            case 'gls.social->changereput':
                //await this._vote.handleVote(transaction);
                break;

            case 'gls.social->unvote':
                //await this._vote.handleUnVote(transaction);
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
