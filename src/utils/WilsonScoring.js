const core = require('gls-core-service');
const BigNum = core.types.BigNum;
const BigNumUtils = BigNum.OriginalBigNumber();

const HOT_RSHARES_BASE = 10000000;
const HOT_TIME_DEGRADATION = 10000;
const TRENDING_RSHARES_BASE = 10000000;
const TRENDING_TIME_DEGRADATION = 480000;

class WilsonScoring {
    static calcHot(rShares, date) {
        return this._calcLikeAWilson({
            rSharesBaseConstant: HOT_RSHARES_BASE,
            timeDegradationConstant: HOT_TIME_DEGRADATION,
            rShares: new BigNum(rShares),
            date,
        });
    }

    static calcTrending(rShares, date) {
        return this._calcLikeAWilson({
            rSharesBaseConstant: TRENDING_RSHARES_BASE,
            timeDegradationConstant: TRENDING_TIME_DEGRADATION,
            rShares: new BigNum(rShares),
            date,
        });
    }

    static _calcLikeAWilson({ rSharesBaseConstant, timeDegradationConstant, rShares, date }) {
        const seconds = Number(date) / 1000;
        const modRShares = rShares.div(rSharesBaseConstant);
        const order = Math.log10(BigNumUtils.max(modRShares.abs(), 1));
        let sign;

        if (modRShares.gt(0)) {
            sign = 1;
        } else if (modRShares.lt(0)) {
            sign = -1;
        } else {
            sign = 0;
        }

        return order * sign + seconds / timeDegradationConstant;
    }
}

module.exports = WilsonScoring;
