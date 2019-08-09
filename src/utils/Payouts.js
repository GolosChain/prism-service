const core = require('gls-core-service');
const { Logger } = core.utils;
const BigNum = core.types.BigNum;

class Payouts {
    static getRewardTypeKey(rewardType) {
        switch (rewardType) {
            case 'author_reward':
                return 'author';

            case 'curator_reward':
                return 'curator';

            case 'benefactor_reward':
                return 'benefactor';

            case 'unclaimed_reward':
                return 'unclaimed';

            default:
                Logger.warn(`Payout - unknown reward type - ${rewardType}`);
                return null;
        }
    }

    static extractTokenInfo(quantity) {
        let [tokenValue, tokenName] = quantity.split(' ');

        tokenValue = new BigNum(tokenValue);

        if (!tokenName || tokenValue.isNaN()) {
            Logger.warn(`Payout - invalid quantity - ${quantity}`);
            return { tokenName: null, tokenValue: null };
        }

        return { tokenName, tokenValue };
    }
}

module.exports = Payouts;
