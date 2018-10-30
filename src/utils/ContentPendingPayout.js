const moment = require('moment');
const core = require('gls-core-service');
const BlockChainValues = core.utils.BlockChainValues;
const BigNum = core.utils.BigNum;

const GOLOS_100_PERCENT = 10000;

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

    calcAndApply() {
        if (this._chainProps.total_reward_shares2 > 0) {
            this._calcPending();
        }

        this._contentModel.payoutDate = this._calcPayoutDate();

        // TODO Uncomment when model done
        // this._contentModel.save();
    }

    _calcPending() {
        const payout = this._calcPayout();
        const crsClaim = this._calcCrsClaim(payout);

        this._authorTokens = payout.minus(crsClaim);

        if (this._contentModel.allowCurationRewards) {
            this._appendCurationRewards(crsClaim);
        }

        const benefactorWeights = this._calcBenefactorWeights();

        if (!benefactorWeights.eq(0)) {
            const totalBeneficiary = this._authorTokens
                .times(benefactorWeights)
                .div(GOLOS_100_PERCENT);

            this._authorTokens = this._authorTokens.minus(totalBeneficiary);
            this._appendBenefactorRewards(totalBeneficiary);
        }

        this._appendAuthorRewards({ ...this._calcAuthorRewardsContext() });
    }

    _calcAuthorRewardsContext() {
        const gbg = this._calcGbgForAuthorReward();
        const vestingGolos = this._authorTokens.minus(gbg);
        const toGbg = new BigNum(this._chainProps.sbd_print_rate).times(gbg).div(GOLOS_100_PERCENT);
        const toGolos = gbg.minus(toGbg);

        return { toGolos, toGbg, vestingGolos };
    }

    _calcGbgForAuthorReward() {
        return this._authorTokens
            .times(this._contentModel.gbgPercent)
            .div(new BigNum(GOLOS_100_PERCENT).times(2));
    }

    _calcBenefactorWeights() {
        let benefactorWeights = new BigNum(0);

        for (let benefactor of this._contentModel.beneficiaries) {
            benefactorWeights = benefactorWeights.plus(new BigNum(benefactor.weight));
        }

        return benefactorWeights;
    }

    _calcPayout() {
        const max = new BigNum(this._contentModel.maxAcceptedPayout);
        let payout = new BigNum(this._contentModel.netRshares);

        if (payout.lt(0)) {
            payout = new BigNum(0);
        }

        payout = payout
            .times(new BigNum(this._contentModel.rewardWeight))
            .div(GOLOS_100_PERCENT)
            .times(this._pot)
            .div(this._totalR2);

        if (payout.lt(max)) {
            return payout;
        }

        return max;
    }

    _calcCrsClaim(payout) {
        const curationTokens = payout
            .times(this._getCurationRewardsPercent())
            .div(GOLOS_100_PERCENT);
        const crsUnclaimed = this._getCuratorUnclaimedRewards(curationTokens);

        return curationTokens.minus(crsUnclaimed);
    }

    _appendCurationRewards(crsClaim) {
        const gests = BlockChainValues.golosToVests(
            crsClaim.times(this._getVestingSharePrice()),
            this._chainProps
        );

        this._contentModel.pending.curatorPayout = this._toGbg(crsClaim);
        this._contentModel.pending.curatorPayoutGests = gests;
        this._contentModel.pending.payout = (
            this._contentModel.pending.payout || new BigNum(0)
        ).plus(this._contentModel.pending.curatorPayout);
    }

    _appendBenefactorRewards(totalBeneficiary) {
        const gests = BlockChainValues.golosToVests(
            totalBeneficiary.times(this._getVestingSharePrice()),
            this._chainProps
        );

        this._contentModel.pending.benefactorPayout = this._toGbg(totalBeneficiary);
        this._contentModel.pending.benefactorPayoutGests = gests;
        this._contentModel.pending.payout = (
            this._contentModel.pending.payout || new BigNum(0)
        ).plus(this._contentModel.pending.benefactorPayout);
    }

    _appendAuthorRewards({ toGolos, toGbg, vestingGolos }) {
        this._contentModel.pending.authorPayoutGolos = toGolos;
        this._contentModel.pending.authorPayoutGbg = this._toGbg(toGbg);
        this._contentModel.pending.authorPayout = this._contentModel.pending.authorPayoutGbg.plus(
            this._toGbg(toGolos.plus(vestingGolos))
        );

        this._contentModel.pending.authorPayoutGests = BlockChainValues.golosToVests(
            vestingGolos.times(this._getVestingSharePrice()),
            this._chainProps
        );
        this._contentModel.pending.payout = (
            this._contentModel.pending.payout || new BigNum(0)
        ).plus(this._contentModel.pending.authorPayout);
    }

    _getCurationRewardsPercent() {
        return new BigNum(GOLOS_100_PERCENT).div(100).times(25);
    }

    _getVestingSharePrice() {
        const fund = new BigNum(this._chainProps.total_vesting_fund_steem);
        const shares = new BigNum(this._chainProps.total_vesting_shares);

        if (fund.eq(0) || shares.eq(0)) {
            return new BigNum(1);
        }

        return BlockChainValues.vestsToGolos(shares, this._chainProps).div(fund);
    }

    _toGbg(value) {
        return value.times(this._gbgRate);
    }

    _calcPayoutDate() {
        const timestamp =
            +moment(this._contentModel.createdInBlockchain).utc() + 60 * 60 * 24 * 7 * 1000;

        return moment(timestamp).format('YYYY-MM-DDTHH:mm:ss');
    }

    _getCuratorUnclaimedRewards(curationTokens) {
        const totalVoteWeight = new BigNum(this._contentModel.totalVoteWeight);
        const totalVoteRealWeight = new BigNum(this._contentModel.totalVoteRealWeight);

        return new BigNum(curationTokens)
            .times(totalVoteWeight.minus(totalVoteRealWeight))
            .div(totalVoteWeight);
    }
}

module.exports = ContentPendingPayout;
