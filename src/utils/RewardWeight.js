const core = require('gls-core-service');
const BigNum = core.types.BigNum;
const BigNumUtils = BigNum.OriginalBigNumber();

const GOLOS_100_PERCENT = new BigNum(10000);
const GOLOS_POST_AVERAGE_WINDOW = new BigNum(60 * 60 * 24 * 1000);
const GOLOS_POST_WEIGHT_CONSTANT = GOLOS_100_PERCENT.times(4).pow(2);

// Warning: Ported and refactored from blockchain node (C++)
class RewardWeight {
    calcAndApply(postModel) {
        const lastPostBandwidth = postModel.bandwidth.averageBandwidth;
        const lastUpdate = Number(postModel.bandwidth.lastUpdate);
        const postDeltaTime = BigNumUtils.min(Date.now() - lastUpdate, GOLOS_POST_AVERAGE_WINDOW);
        const windowDiff = GOLOS_POST_AVERAGE_WINDOW - postDeltaTime;
        const oldWeight = lastPostBandwidth.times(windowDiff).div(GOLOS_POST_AVERAGE_WINDOW);
        const currentPostBandwidth = oldWeight.plus(GOLOS_100_PERCENT);
        const bandwidthExp = currentPostBandwidth.pow(2);
        const weightByPercent = GOLOS_POST_WEIGHT_CONSTANT.times(GOLOS_100_PERCENT);
        const rewardWeight = BigNumUtils.min(weightByPercent.div(bandwidthExp), GOLOS_100_PERCENT);

        postModel.bandwidth.lastUpdate = new Date();
        postModel.bandwidth.averageBandwidth = currentPostBandwidth;
        postModel.payout.rewardWeight = rewardWeight;
    }
}

module.exports = RewardWeight;
