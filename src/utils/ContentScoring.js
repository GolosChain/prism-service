const core = require('gls-core-service');
const BigNum = core.types.BigNum;
const BigNumUtils = BigNum.OriginalBigNumber();

const HOT_RSHARES_BASE = 10000000;
const HOT_TIME_DEGRADATION = 10000;
const TRENDING_RSHARES_BASE = 10000000;
const TRENDING_TIME_DEGRADATION = 480000;

// TODO -
// Warning: Ported and refactored from blockchain node (C++)
class ContentScoring {
    calcActual(netRshares, createdInBlockChain) {
        return this._calcLikeAWilson({
            rsharesBase: HOT_RSHARES_BASE,
            timeDegradation: HOT_TIME_DEGRADATION,
            netRshares,
            createdInBlockChain,
        });
    }

    calcPopular(netRshares, createdInBlockChain) {
        return this._calcLikeAWilson({
            rsharesBase: TRENDING_RSHARES_BASE,
            timeDegradation: TRENDING_TIME_DEGRADATION,
            netRshares,
            createdInBlockChain,
        });
    }

    _calcLikeAWilson({ rsharesBase, timeDegradation, netRshares, createdInBlockChain }) {
        if (netRshares.isNaN()) {
            return 0;
        }

        const seconds = +createdInBlockChain / 1000;
        const modRshares = netRshares.div(rsharesBase);
        const order = Math.log10(BigNumUtils.max(modRshares.abs(), 1));
        let sign;

        if (modRshares.gt(0)) {
            sign = 1;
        } else if (modRshares.lt(0)) {
            sign = -1;
        } else {
            sign = 0;
        }

        return order * sign + seconds / timeDegradation;
    }
}

module.exports = ContentScoring;
