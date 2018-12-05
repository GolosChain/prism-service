const golos = require('golos-js');
const core = require('gls-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const stats = core.utils.statsClient;
const BigNum = core.types.BigNum;
const env = require('../data/env');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

class PayoutFinalizer extends BasicService {
    async start() {
        this.startLoop(0, env.GLS_PAYOUT_FINALIZER_INTERVAL);
    }

    async stop() {
        this.stopLoop();
    }

    async iteration() {
        try {
            await this._finalizePosts();
            await this._finalizeComments();
        } catch (error) {
            Logger.error(`Can't finalize payouts - ${error.stack}`);
            stats.increment('logic_service_error');
        }
    }

    async _finalizePosts() {
        const posts = await Post.find(this._getQuery());

        await this._finalizeContents(posts);
    }

    async _finalizeComments() {
        // TODO In next version (not in MVP)
    }

    async _finalizeContents(models) {
        for (const model of models) {
            const content = await golos.api.getContentAsync(model.author, model.permlink, 0);
            const payout = model.payout;
            const final = payout.final;

            payout.rewardWeight = new BigNum(content.reward_weight);
            payout.netRshares = new BigNum(content.net_rshares);
            payout.isDone = true;

            final.authorGolos = new BigNum(content.author_golos_payout_value);
            final.authorGbg = new BigNum(content.author_gbg_payout_value);
            final.authorGests = new BigNum(content.author_gests_payout_value);
            final.curatorValue = new BigNum(content.curator_payout_value);
            final.curatorGests = new BigNum(content.curator_gests_payout_value);
            final.benefactorValue = new BigNum(content.beneficiary_payout_value);
            final.benefactorGests = new BigNum(content.beneficiary_gests_payout_value);
            final.totalValue = new BigNum(content.total_payout_value);

            await model.save();
        }
    }

    _getQuery() {
        const diff = Date.now() - env.GLS_PAYOUT_RANGE;

        return {
            createdInBlockchain: { $lt: new Date(diff) },
            'payout.isDone': false,
        };
    }
}

module.exports = PayoutFinalizer;
