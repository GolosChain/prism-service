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
            baseConstant: HOT_RSHARES_BASE,
            timeDegradationConstant: HOT_TIME_DEGRADATION,
            value: new BigNum(rShares),
            date,
        });
    }

    static calcTrending(rShares, date) {
        return this._calcLikeAWilson({
            baseConstant: TRENDING_RSHARES_BASE,
            timeDegradationConstant: TRENDING_TIME_DEGRADATION,
            value: new BigNum(rShares),
            date,
        });
    }

    static _calcLikeAWilson({ baseConstant, timeDegradationConstant, value, date }) {
        const seconds = Number(date) / 1000;
        const modValue = value.div(baseConstant);
        const order = Math.log10(BigNumUtils.max(modValue.abs(), 1));
        let sign;

        if (modValue.gt(0)) {
            sign = 1;
        } else if (modValue.lt(0)) {
            sign = -1;
        } else {
            sign = 0;
        }

        return order * sign + seconds / timeDegradationConstant;
    }
}

module.exports = WilsonScoring;
