const GOLOS_ROOT_POST_PARENT = '';
const GOLOS_100_PERCENT = 10000;
const moment = require('moment');
const core = require('gls-core-service');
const BlockChainValues = core.utils.BlockChainValues;

// Warning: Ported and refactored from blockchain node (C++)
class ContentPendingPayout {
    constructor(contentModel, chainProps, gbgRate) {
        this._contentModel = contentModel;
        this._chainProps = chainProps;
        this._gbgRate = gbgRate;
        this._pot = parseFloat(chainProps.total_reward_fund_steem);
        this._totalR2 = parseFloat(chainProps.total_reward_shares2);
        this._authorTokens = null;
    }

    applyToTarget() {
        if (this._chainProps.total_reward_shares2 > 0) {
            this._calcPending();
        }

        if (this._contentModel.parentAuthor !== GOLOS_ROOT_POST_PARENT) {
            this._contentModel.payoutDate = this._calcPayoutDate();
        }

        this._contentModel.save();
    }

    _calcPending() {
        const payout = this._calcPayout();
        const crsClaim = this._calcCrsClaim(payout);

        this._authorTokens = payout - crsClaim;

        if (this._contentModel.allowCurationRewards) {
            this._appendCurationRewards(crsClaim);
        }

        const benefactorWeights = this._calcBenefactorWeights();

        if (benefactorWeights !== 0) {
            const totalBeneficiary = (this._authorTokens * benefactorWeights) / GOLOS_100_PERCENT;

            this._authorTokens -= totalBeneficiary;
            this._appendBenefactorRewards(totalBeneficiary);
        }

        this._appendAuthorRewards({ ...this._calcAuthorRewardsContext() });
    }

    _calcAuthorRewardsContext() {
        const gbg = this._calcGbgForAuthorReward();
        const vestingGolos = this._authorTokens - gbg;
        const toGbg = (this._chainProps.sbd_print_rate * gbg) / GOLOS_100_PERCENT;
        const toGolos = gbg - toGbg;

        this._contentModel.pending.authorPayoutGests = vestingGolos * this._getVestingSharePrice();

        return { toGolos, toGbg, vestingGolos };
    }

    _calcGbgForAuthorReward() {
        return (this._authorTokens * this._contentModel.gbgPercent) / (2 * GOLOS_100_PERCENT);
    }

    _calcBenefactorWeights() {
        let benefactorWeights = 0;

        for (let benefactor of this._contentModel.beneficiaries) {
            benefactorWeights += benefactor.weight;
        }

        return benefactorWeights;
    }

    _calcPayout() {
        let payout = this._contentModel.netRshares;

        if (payout < 0) {
            payout = 0;
        }

        payout =
            (((payout * this._contentModel.rewardWeight) / GOLOS_100_PERCENT) * this._pot) /
            this._totalR2;

        return Math.min(payout, this._contentModel.maxAcceptedPayout);
    }

    _calcCrsClaim(payout) {
        const curationTokens = (payout * this._getCurationRewardsPercent()) / GOLOS_100_PERCENT;
        const crsUnclaimed = this._getCuratorUnclaimedRewards(curationTokens);

        return curationTokens - crsUnclaimed;
    }

    _appendCurationRewards(crsClaim) {
        this._contentModel.pending.curatorPayout = this._toGbg(crsClaim);
        this._contentModel.pending.curatorPayoutGests = crsClaim * this._getVestingSharePrice();
        this._contentModel.pending.payout += this._contentModel.pending.curatorPayout;
    }

    _appendBenefactorRewards(totalBeneficiary) {
        this._contentModel.pending.benefactorPayout = this._toGbg(totalBeneficiary);
        this._contentModel.pending.benefactorPayoutGests =
            totalBeneficiary * this._getVestingSharePrice();
        this._contentModel.pending.payout += this._contentModel.pending.benefactorPayout;
    }

    _appendAuthorRewards(toGolos, toGbg, vestingGolos) {
        this._contentModel.pending.authorPayoutGolos = toGolos;
        this._contentModel.pending.authorPayoutGbg = this._toGbg(toGbg);
        this._contentModel.pending.authorPayout =
            this._contentModel.pending.authorPayoutGbg + this._toGbg(toGolos + vestingGolos);
        this._contentModel.pending.payout += this._contentModel.pending.authorPayout;
    }

    _getCurationRewardsPercent() {
        return (GOLOS_100_PERCENT / 100) * 25;
    }

    _getVestingSharePrice() {
        const fund = parseFloat(this._chainProps.total_vesting_fund_steem);
        const shares = parseFloat(this._chainProps.total_vesting_shares);

        if (fund === 0 || shares === 0) {
            return 1;
        }

        return BlockChainValues.vestsToGolos(shares, this._chainProps) / fund;
    }

    _toGbg(value) {
        return value * this._gbgRate;
    }

    _calcPayoutDate() {
        const timestamp = +moment(this._contentModel.createdInBlockchain).utc() + 60 * 60 * 24 * 7;

        return moment(timestamp)
            .utc()
            .format('YYYY-MM-DDTHH:mm:ss');
    }

    _getCuratorUnclaimedRewards(curationTokens) {
        const { totalVoteWeight, totalVoteRealWeight } = this._contentModel;

        return (curationTokens * (totalVoteWeight - totalVoteRealWeight)) / totalVoteWeight;
    }
}

module.exports = ContentPendingPayout;
