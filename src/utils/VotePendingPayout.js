const REVERSE_AUCTION_WINDOW_SECONDS = 60 * 30;
const VOTE_REGENERATION_SECONDS = 5 * 60 * 60 * 24;
const GOLOS_100_PERCENT = 10000;
const CONTENT_CONSTANT = 2000000000000n;

class VotePendingPayout {
    constructor({ voteModel, recentVoteModel, contentModel, userModel }, chainProps, blockTime) {
        this._voteModel = voteModel;
        this._recentVoteModel = recentVoteModel;
        this._contentModel = voteModel;
        this._userModel = userModel;
        this._voteRegenerationPerDay = chainProps.vote_regeneration_per_day;
        this._blockTime = blockTime;
        this._absRshares = null;
    }

    calcAndApply() {
        const currentPower = this._calcCurrentPower();
        const usedPower = this._calcUsedPower(currentPower);

        this._absRshares = (this._calcEffectiveVestingShares() * usedPower) / GOLOS_100_PERCENT;

        if (this._recentVoteModel) {
            this._handleUpdateVote(currentPower, usedPower);
        } else {
            this._handleNewVote(currentPower, usedPower);
        }

        this._saveChanges();
    }

    _handleUpdateVote(currentPower, usedPower) {
        const rshares = this._getRshares();

        this._userModel.votingPower = currentPower - usedPower;
        this._userModel.lastVoteTime = this._blockTime;
        this._contentModel.netRshares -= this._recentVoteModel.rshares;
        this._contentModel.netRshares += rshares;
        this._contentModel.totalVoteWeight -= this._recentVoteModel.weight;

        this._voteModel.rshares = rshares;
        this._voteModel.percent = this._voteModel.weight;
        this._voteModel.lastUpdateInBlockchain = this._blockTime;
        this._voteModel.weight = 0;
    }

    _handleNewVote(currentPower, usedPower) {
        const rshares = this._getRshares();

        this._userModel.votingPower = currentPower - usedPower;
        this._userModel.lastVoteTime = this._blockTime;
        this._contentModel.netRshares += rshares;
        this._voteModel.rshares = rshares;
        this._voteModel.percent = this._voteModel.weight;
        this._voteModel.lastUpdateInBlockchain = this._blockTime;

        this._calcTotalWeight();
    }

    _calcTotalWeight() {
        const oldVoteRshares = this._contentModel.voteRshares;
        let voteWeight = 0;

        if (rshares > 0 && this._contentModel.allowCurationRewards) {
            const contentVoteRshares = this._contentModel.voteRshares;
            const bigIntOldFilter = 2n ** 64n * oldVoteRshares;
            const oldWeight = bigIntOldFilter / (2 * CONTENT_CONSTANT + oldVoteRshares);
            const bitIntNewFilter = 2n ** 64n * contentVoteRshares;
            const newWeight = bitIntNewFilter / (2 * CONTENT_CONSTANT + contentVoteRshares);
            const elapsed = this._calcElapsedFromPostCreation();
            const filtered = Math.min(elapsed, REVERSE_AUCTION_WINDOW_SECONDS);

            voteWeight = newWeight - oldWeight;

            this._voteModel.weight = (voteWeight * filtered) / REVERSE_AUCTION_WINDOW_SECONDS;
        } else {
            this._voteModel.weight = 0;
        }

        this._contentModel.totalVoteWeight += voteWeight;
        this._contentModel.totalVoteRealWeight += this._voteModel.weight;
    }

    _calcElapsedFromPostCreation() {
        return this._secondsDiff(
            this._voteModel.lastUpdateInBlockchain - this._contentModel.createdInBlockchain
        );
    }

    _getRshares() {
        if (this._voteModel.weight >= 0) {
            return this._absRshares;
        } else {
            return -this._absRshares;
        }
    }

    _calcCurrentPower() {
        const elapsedSeconds = this._secondsDiff(this._blockTime - this._userModel.lastVoteTime);
        const regeneratedPower = (GOLOS_100_PERCENT * elapsedSeconds) / VOTE_REGENERATION_SECONDS;

        return Math.min(this._userModel.votingPower + regeneratedPower, GOLOS_100_PERCENT);
    }

    _calcUsedPower(currentPower) {
        const absWeight = Math.abs(this._voteModel.weight);
        const basedUsedPower = (currentPower * absWeight) / GOLOS_100_PERCENT;

        const voteDenom =
            (this._voteRegenerationPerDay * VOTE_REGENERATION_SECONDS) / (60 * 60 * 24);

        return (basedUsedPower + voteDenom - 1) / voteDenom;
    }

    _calcEffectiveVestingShares() {
        const model = this._userModel;

        return model.vesting - model.delegatedToAnother + model.delegatedFromAnother;
    }

    _secondsDiff(date1, date2) {
        return (+date1 - +date2) / 1000;
    }

    _saveChanges() {
        this._voteModel.save();
        this._contentModel.save();
        this._userModel.save();
    }
}

module.exports = VotePendingPayout;
