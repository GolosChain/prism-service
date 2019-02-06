const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Post = require('./Post');

// TODO Change after MVP
const communityRegistry = ['gls.publish'];

class Main {
    constructor() {
        this._post = new Post();
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
                await this._post.handleCreation(transaction, blockNum);
                break;
            default:
            // unknown transaction, do nothing
        }
    }
}

module.exports = Main;
