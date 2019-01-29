const core = require('gls-core-service');
const BigNum = core.types.BigNum;
const BigNumUtils = BigNum.OriginalBigNumber();

const REVERSE_AUCTION_WINDOW_SECONDS = 60 * 30;
const VOTE_REGENERATION_SECONDS = 5 * 60 * 60 * 24;
const GOLOS_100_PERCENT = new BigNum(10000);
const CONTENT_CONSTANT = new BigNum('2000000000000');
const BIG_INT_VOTE_FILTER = new BigNum(2).pow(64);

// Warning: Ported and refactored from blockchain node (C++)
class VotePendingPayout {
    constructor({ voteModel, recentVoteModel, contentModel, userModel }, chainProps, blockTime) { // TODO REMOVED!
        this._voteModel = voteModel;
        this._recentVoteModel = recentVoteModel;
        this._contentModel = contentModel;
        this._userModel = userModel;
        this._voteRegenerationPerDay = chainProps.voteRegenerationPerDay; // TODO REMOVED!
        this._blockTime = blockTime;
        this._absRshares = null;
    }

    async calcAndApply() {
        const currentPower = this._calcCurrentPower();
        const usedPower = this._calcUsedPower(currentPower);

        this._absRshares = this._calcEffectiveVestingShares()
            .times(usedPower)
            .div(GOLOS_100_PERCENT);

        if (this._recentVoteModel) {
            this._handleUpdateVote(currentPower, usedPower);
        } else {
            this._handleNewVote(currentPower, usedPower);
        }

        await this._saveChanges();
    }

    _handleUpdateVote(currentPower, usedPower) {
        const rshares = this._getRshares();

        this._userModel.votingPower = currentPower.minus(usedPower);
        this._userModel.lastVoteTime = this._blockTime;
        this._contentModel.payout.netRshares = this._contentModel.payout.netRshares.minus(
            this._recentVoteModel.rshares
        );
        this._contentModel.payout.netRshares = this._contentModel.payout.netRshares.plus(rshares);
        this._contentModel.vote.totalWeight = this._contentModel.vote.totalWeight.minus(
            this._recentVoteModel.weight
        );

        this._voteModel.rshares = rshares;
        this._voteModel.percent = this._voteModel.weight;
        this._voteModel.lastUpdateInBlockchain = this._blockTime;
        this._voteModel.weight = 0;
    }

    _handleNewVote(currentPower, usedPower) {
        const rshares = this._getRshares();

        this._userModel.votingPower = currentPower.minus(usedPower);
        this._userModel.lastVoteTime = this._blockTime;
        this._contentModel.payout.netRshares = this._contentModel.payout.netRshares.plus(rshares);
        this._voteModel.rshares = rshares;
        this._voteModel.percent = this._voteModel.weight;
        this._voteModel.lastUpdateInBlockchain = this._blockTime;

        this._calcTotalWeight();
    }

    _calcTotalWeight() {
        const model = this._contentModel;
        const oldVoteRshares = model.vote.rshares;
        let voteWeight = 0;

        if (model.vote.rshares > 0 && model.options.allowCurationRewards) {
            const contentVoteRshares = model.vote.rshares;
            const bigIntOldFilter = BIG_INT_VOTE_FILTER.times(oldVoteRshares);
            const oldWeight = bigIntOldFilter.div(CONTENT_CONSTANT.times(2).plus(oldVoteRshares));
            const bitIntNewFilter = BIG_INT_VOTE_FILTER.times(contentVoteRshares);
            const newWeight = bitIntNewFilter.div(
                CONTENT_CONSTANT.times(2).plus(contentVoteRshares)
            );
            const elapsed = this._calcElapsedFromPostCreation();
            const filtered = Math.min(elapsed, REVERSE_AUCTION_WINDOW_SECONDS);

            voteWeight = newWeight.minus(oldWeight);

            this._voteModel.weight = voteWeight.times(filtered).div(REVERSE_AUCTION_WINDOW_SECONDS);
        } else {
            this._voteModel.weight = 0;
        }

        model.vote.totalWeight = model.vote.totalWeight.plus(voteWeight);
        model.vote.totalRealWeight = model.vote.totalRealWeight.plus(this._voteModel.weight);
    }

    _calcElapsedFromPostCreation() {
        return this._secondsDiff(
            this._voteModel.lastUpdateInBlockchain,
            this._contentModel.createdInBlockchain
        );
    }

    _getRshares() {
        if (this._voteModel.weight >= 0) {
            return this._absRshares;
        } else {
            return this._absRshares.negated();
        }
    }

    _calcCurrentPower() {
        const elapsedSeconds = this._secondsDiff(this._blockTime, this._userModel.lastVoteTime);
        const regeneratedPower = new BigNum(GOLOS_100_PERCENT * elapsedSeconds).div(
            VOTE_REGENERATION_SECONDS
        );

        return BigNumUtils.min(
            this._userModel.votingPower.plus(regeneratedPower),
            GOLOS_100_PERCENT
        );
    }

    _calcUsedPower(currentPower) {
        const absWeight = this._voteModel.weight.abs();
        const basedUsedPower = currentPower.times(absWeight).div(GOLOS_100_PERCENT);

        const voteDenom = this._voteRegenerationPerDay
            .times(VOTE_REGENERATION_SECONDS)
            .div(60 * 60 * 24);

        return basedUsedPower
            .plus(voteDenom)
            .minus(1)
            .div(voteDenom);
    }

    _calcEffectiveVestingShares() {
        const model = this._userModel;

        return model.vesting.original.minus(model.delegatedToAnother).plus(model.delegatedFromAnother);
    }

    _secondsDiff(date1, date2) {
        return new BigNum((Number(date1) - Number(date2)) / 1000);
    }

    async _saveChanges() {
        await this._voteModel.save();
        await this._contentModel.save();
        await this._userModel.save();
    }
}

module.exports = VotePendingPayout;
