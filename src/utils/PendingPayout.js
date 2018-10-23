const GOLOS_ROOT_POST_PARENT = '';
const GOLOS_100_PERCENT = 10000;
const moment = require('moment');
const core = require('gls-core-service');
const BlockChainValues = core.utils.BlockChainValues;

// Warning: Ported and refactored from blockchain node (C++)
class PendingPayout {
    constructor(target, props, gbgRate) {
        this._target = target;
        this._props = props;
        this._gbgRate = gbgRate;
        this._pot = parseFloat(props.total_reward_fund_steem);
        this._totalR2 = parseFloat(props.total_reward_shares2);
        this._authorTokens = null;
    }

    applyToTarget() {
        if (this._props.total_reward_shares2 > 0) {
            this._calcPending();
        }

        if (this._target.parentAuthor !== GOLOS_ROOT_POST_PARENT) {
            this._target.payoutDate = this._calcPayoutDate();
        }

        this._target.save();
    }

    _calcPending() {
        const payout = this._calcPayout();
        const crsClaim = this._calcCrsClaim(payout);

        this._authorTokens = payout - crsClaim;

        if (this._target.allowCurationRewards) {
            this._appendCurationRewards(crsClaim);
        }

        const benefactorWeights = this._calcBenefactorWeights();

        if (benefactorWeights !== 0) {
            const totalBeneficiary = (this._authorTokens * benefactorWeights) / GOLOS_100_PERCENT;

            this._authorTokens -= totalBeneficiary;
            this._appendBenefactorRewards(totalBeneficiary);
        }

        this._appendAuthorRewards({ ...this._calcAuthorRewardsContext() });
        this._calcTotalPayout();
    }

    _calcAuthorRewardsContext() {
        const gbg = this._calcGbgForAuthorReward();
        const vestingGolos = this._authorTokens - gbg;
        const toGbg = (this._props.sbd_print_rate * gbg) / GOLOS_100_PERCENT;
        const toGolos = gbg - toGbg;

        this._target.pending.authorPayoutGests = vestingGolos * this._getVestingSharePrice();

        return { toGolos, toGbg, vestingGolos };
    }

    _calcGbgForAuthorReward() {
        return (this._authorTokens * this._target.gbgPercent) / (2 * GOLOS_100_PERCENT);
    }

    _calcBenefactorWeights() {
        let benefactorWeights = 0;

        for (let benefactor of this._target.beneficiaries) {
            benefactorWeights += benefactor.weight;
        }

        return benefactorWeights;
    }

    _calcPayout() {
        let payout = this._target.netRshares;

        if (payout < 0) {
            payout = 0;
        }

        payout =
            (((payout * this._target.rewardWeight) / GOLOS_100_PERCENT) * this._pot) /
            this._totalR2;

        return Math.min(payout, this._target.maxAcceptedPayout);
    }

    _calcCrsClaim(payout) {
        const curationTokens = (payout * this._getCurationRewardsPercent()) / GOLOS_100_PERCENT;
        const crsUnclaimed = this._getCuratorUnclaimedRewards(curationTokens);

        return curationTokens - crsUnclaimed;
    }

    _appendCurationRewards(crsClaim) {
        this._target.pending.curatorPayout = this._toGbg(crsClaim);
        this._target.pending.curatorPayoutGests = crsClaim * this._getVestingSharePrice();
        this._target.pending.payout += this._target.pending.curatorPayout;
    }

    _appendBenefactorRewards(totalBeneficiary) {
        this._target.pending.benefactorPayout = this._toGbg(totalBeneficiary);
        this._target.pending.benefactorPayoutGests =
            totalBeneficiary * this._getVestingSharePrice();
        this._target.pending.payout += this._target.pending.benefactorPayout;
    }

    _appendAuthorRewards(toGolos, toGbg, vestingGolos) {
        this._target.pending.authorPayoutGolos = toGolos;
        this._target.pending.authorPayoutGbg = this._toGbg(toGbg);
        this._target.pending.authorPayout =
            this._target.pending.authorPayoutGbg + this._toGbg(toGolos + vestingGolos);
        this._target.pending.payout += this._target.pending.authorPayout;
    }

    _calcTotalPayout() {
        let tpp = (this._target.childrenRshares2 * this._pot) / this._totalR2;

        this._target.totalPendingPayout = this._toGbg(tpp);
    }

    _getCurationRewardsPercent() {
        return (GOLOS_100_PERCENT / 100) * 25;
    }

    _getVestingSharePrice() {
        const fund = parseFloat(this._props.total_vesting_fund_steem);
        const shares = parseFloat(this._props.total_vesting_shares);

        if (fund === 0 || shares === 0) {
            return 1;
        }

        return BlockChainValues.vestsToGolos(shares, this._props) / fund;
    }

    _toGbg(value) {
        return value * this._gbgRate;
    }

    _calcPayoutDate() {
        const timestamp = +moment(this._target.createdInBlockchain).utc() + 60 * 60 * 24 * 7;

        return moment(timestamp)
            .utc()
            .format('YYYY-MM-DDTHH:mm:ss');
    }

    _getCuratorUnclaimedRewards(curationTokens) {
        const { totalWeight, totalRealWeight } = this._target;

        return (curationTokens * (totalWeight - totalRealWeight)) / totalWeight;
    }
}

module.exports = PendingPayout;
