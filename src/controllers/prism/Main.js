const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Post = require('./Post');
const Comment = require('./Comment');
const Profile = require('./Profile');
const Vote = require('./Vote');

// TODO Change after MVP
const communityRegistry = ['gls.publish', 'gls.social', 'gls.vesting', 'eosio'];

class Main {
    constructor() {
        this._post = new Post();
        this._comment = new Comment();
        this._profile = new Profile();
        this._vote = new Vote();
    }

    async disperse({ transactions, blockNum }) {
        for (const transaction of transactions) {
            await this._disperseTransaction(transaction, blockNum);
        }
    }

    async _disperseTransaction(transaction, blockNum) {
        if (!transaction) {
            Logger.error('Empty transaction! But continue.');
            return;
        }

        if (!communityRegistry.includes(transaction.receiver)) {
            return;
        }

        const pathName = [transaction.code, transaction.action].join('->');

        switch (pathName) {
            case 'gls.publish->createmssg':
                await this._post.handleCreate(transaction, blockNum);
                await this._comment.handleCreate(transaction, blockNum);
                break;
            case 'eosio->newaccount':
                await this._profile.handleCreate(transaction);
                break;
            case 'gls.social->updatemeta':
                await this._profile.handleMeta(transaction);
                break;
            default:
            // unknown transaction, do nothing
        }
    }
}

module.exports = Main;
