const REVERSE_AUCTION_WINDOW_SECONDS = 60 * 30;
const VOTE_REGENERATION_SECONDS = 5 * 60 * 60 * 24;
const GOLOS_100_PERCENT = 10000;

class VotePendingPayout {
    constructor({ voteModel, contentModel, userModel }, chainProps, blockTime) {
        this._voteModel = voteModel;
        this._contentModel = voteModel;
        this._userModel = userModel;
        this._voteRegenerationPerDay = chainProps.vote_regeneration_per_day;
        this._blockTime = blockTime;
    }

    do_apply() {
        const comment_vote_idx = _db
            .get_index /*comment_vote_index*/
            ()
            .indices()
            .get /*by_comment_voter*/
            ();
        const itr = comment_vote_idx.find(
            std__make_tuple(this._contentModel.id, this._userModel.id)
        );
        const elapsedSeconds = this._secondsDiff(this._blockTime - this._userModel.lastVoteTime);
        const regeneratedPower = (GOLOS_100_PERCENT * elapsedSeconds) / VOTE_REGENERATION_SECONDS;
        const currentPower = Math.min(
            this._userModel.votingPower + regeneratedPower,
            GOLOS_100_PERCENT
        );

        const absWeight = Math.abs(this._voteModel.weight);
        let usedPower = (currentPower * absWeight) / GOLOS_100_PERCENT;

        const voteDenom =
            (this._voteRegenerationPerDay * VOTE_REGENERATION_SECONDS) / (60 * 60 * 24);

        usedPower = (usedPower + voteDenom - 1) / voteDenom;

        const absRshares =
            (this._userModel.effective_vesting_shares().amount * usedPower) / GOLOS_100_PERCENT;

        if (itr === comment_vote_idx.end()) {
            const rshares = this._voteModel.weight < 0 ? -absRshares : absRshares;

            this._userModel.votingPower = currentPower - usedPower;
            this._userModel.lastVoteTime = this._blockTime;

            const oldVoteRshares = this._contentModel.voteRshares;

            this._contentModel.netRshares += rshares;

            let voteWeight = 0;
            let realVoteWeight = 0;

            this._voteModel.comment = this._contentModel.id;
            this._voteModel.rshares = rshares;
            this._voteModel.percent = this._voteModel.weight;
            this._voteModel.lastUpdateInBlockchain = this._blockTime;

            if (                                                              // TODO
                rshares > 0 &&
                this._contentModel.last_payout === fc__time_point_sec() &&
                this._contentModel.allow_curation_rewards
            ) {
                const oldWeight =
                    /*uint64_t*/ (std__numeric_limits__max() *
                        fc__uint128_t(oldVoteRshares.value)) /
                    (2 * _db.get_content_constant_s() + oldVoteRshares.value);
                const newWeight =
                    /*uint64_t*/ (std__numeric_limits__max() *
                        fc__uint128_t(this._contentModel.voteRshares)) /
                    (2 * _db.get_content_constant_s() + this._contentModel.voteRshares);

                this._voteModel.weight = newWeight - oldWeight;

                voteWeight = this._voteModel.weight;

                const filteredAuctionWindow = Math.min(
                    this._secondsDiff(
                        this._voteModel.lastUpdateInBlockchain -
                            this._contentModel.createdInBlockchain
                    ),
                    REVERSE_AUCTION_WINDOW_SECONDS
                );

                this._voteModel.weight =
                    (voteWeight * filteredAuctionWindow) / REVERSE_AUCTION_WINDOW_SECONDS;

                realVoteWeight = this._voteModel.weight;
            } else {
                this._voteModel.weight = 0;
            }

            if (voteWeight) {
                this._contentModel.totalVoteWeight += voteWeight;
                this._contentModel.totalVoteRealWeight += realVoteWeight;
            }
        } else {
            const rshares = this._voteModel.weight < 0 ? -absRshares : absRshares;

            this._userModel.votingPower = currentPower - usedPower;
            this._userModel.lastVoteTime = this._blockTime;
            this._contentModel.netRshares -= itr.rshares;
            this._contentModel.netRshares += rshares;
            this._contentModel.totalVoteWeight -= itr.weight;

            this._voteModel.rshares = rshares;
            this._voteModel.percent = this._voteModel.weight;
            this._voteModel.lastUpdateInBlockchain = this._blockTime;
            this._voteModel.weight = 0;
        }

        this._voteModel.save();
        this._contentModel.save();
        this._userModel.save();
    }

    _secondsDiff(date1, date2) {
        return (+date1 - +date2) / 1000;
    }
}

module.exports = VotePendingPayout;
