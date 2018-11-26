// TODO -

const GOLOS_100_PERCENT = new BigNum(10000);

// Warning: Ported and refactored from blockchain node (C++)
class RewardWeight {
    calcAndApply(model) {
        let post_bandwidth = band.average_bandwidth;

        let post_delta_time = Math.min(
            Date.now() -
            band.last_bandwidth_update, STEEMIT_POST_AVERAGE_WINDOW);
        let old_weight = (post_bandwidth *
            (STEEMIT_POST_AVERAGE_WINDOW -
                post_delta_time)) /
            STEEMIT_POST_AVERAGE_WINDOW;
        post_bandwidth = (old_weight + GOLOS_100_PERCENT);
        let reward_weight = Math.min(
            (STEEMIT_POST_WEIGHT_CONSTANT *
                STEEMIT_100_PERCENT) /
            (post_bandwidth.value *
                post_bandwidth.value), uint64_t(GOLOS_100_PERCENT));

        model.bandwidth.lastUpdate = new Date();
        model.payout.rewardWeight = post_bandwidth;
    }
}

module.exports = RewardWeight;
