const core = require('gls-core-service');
const BlockChainValues = core.utils.BlockChainValues;
const BigNum = core.types.BigNum;
const Abstract = require('./AbstractPropsCache');
const env = require('../data/env');

class FeedPrice extends Abstract {
    async start() {
        await super.start(env.GLS_FEED_PRICE_INTERVAL);
    }

    async _extract() {
        const raw = await BlockChainValues.getCurrentMedianHistoryPrice();

        this._currentValues = {
            base: new BigNum(raw.base),
            quote: new BigNum(raw.quote),
        };

        this._currentValues.gbgRate = this._currentValues.base.div(this._currentValues.quote);
    }
}

module.exports = FeedPrice;
