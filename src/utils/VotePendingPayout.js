const REVERSE_AUCTION_WINDOW_SECONDS = 60 * 30;
const VOTE_REGENERATION_SECONDS = 5 * 60 * 60 * 24;
const GOLOS_100_PERCENT = 10000;

class VotePendingPayout {
    constructor(voteModel, chainProps) {
        this._voteModel = voteModel;
        this._chainProps = chainProps;
    }

    do_apply(vote_raw) {
        const comment = _db.get_comment(vote_raw.author, vote_raw.permlink);
        const voter = _db.get_account(vote_raw.voter);

        const comment_vote_idx = _db
            .get_index /*comment_vote_index*/
            ()
            .indices()
            .get /*by_comment_voter*/
            ();
        let itr = comment_vote_idx.find(std__make_tuple(comment.id, voter.id));
        let elapsed_seconds = (_db.head_block_time() - voter.last_vote_time).to_seconds();
        let regenerated_power = (GOLOS_100_PERCENT * elapsed_seconds) / VOTE_REGENERATION_SECONDS;
        let current_power = Math.min(voter.voting_power + regenerated_power, GOLOS_100_PERCENT);

        let abs_weight = Math.abs(vote_raw.weight);
        let used_power = (current_power * abs_weight) / GOLOS_100_PERCENT;

        const chainProps = this._chainProps;

        let max_vote_denom =
            (chainProps.vote_regeneration_per_day * VOTE_REGENERATION_SECONDS) / (60 * 60 * 24);

        used_power = (used_power + max_vote_denom - 1) / max_vote_denom;

        let abs_rshares =
            (voter.effective_vesting_shares().amount * used_power) / GOLOS_100_PERCENT;

        if (itr === comment_vote_idx.end()) {
            let rshares = vote_raw.weight < 0 ? -abs_rshares : abs_rshares;

            _db.modify(voter, account_object => {
                account_object.voting_power = current_power - used_power;
                account_object.last_vote_time = _db.head_block_time();
            });

            let old_vote_rshares = comment.vote_rshares;

            _db.modify(comment, comment_object => {
                comment_object.net_rshares += rshares;
            });

            let max_vote_weight = 0;

            _db.create(comment_vote_object => {
                comment_vote_object.comment = comment.id;
                comment_vote_object.rshares = rshares;
                comment_vote_object.vote_percent = vote_raw.weight;
                comment_vote_object.last_update = _db.head_block_time();

                if (
                    rshares > 0 &&
                    comment.last_payout === fc__time_point_sec() &&
                    comment.allow_curation_rewards
                ) {
                    let old_weight =
                        /*uint64_t*/ (std__numeric_limits__max() *
                            fc__uint128_t(old_vote_rshares.value)) /
                        (2 * _db.get_content_constant_s() + old_vote_rshares.value);
                    let new_weight =
                        /*uint64_t*/ (std__numeric_limits__max() *
                            fc__uint128_t(comment.vote_rshares)) /
                        (2 * _db.get_content_constant_s() + comment.vote_rshares);
                    comment_vote_object.weight = new_weight - old_weight;

                    max_vote_weight = comment_vote_object.weight;

                    let w = max_vote_weight;
                    let delta_t = Math.min(
                        (comment_vote_object.last_update - comment.created).to_seconds(),
                        REVERSE_AUCTION_WINDOW_SECONDS
                    );

                    w *= delta_t;
                    w /= REVERSE_AUCTION_WINDOW_SECONDS;
                    comment_vote_object.weight = w;
                } else {
                    comment_vote_object.weight = 0;
                }
            });

            if (max_vote_weight) {
                _db.modify(comment, comment_object => {
                    comment_object.total_vote_weight += max_vote_weight;
                });
            }
        } else {
            let rshares = vote_raw.weight < 0 ? -abs_rshares : abs_rshares;

            _db.modify(voter, account_object => {
                account_object.voting_power = current_power - used_power;
                account_object.last_vote_time = _db.head_block_time();
            });

            _db.modify(comment, comment_object => {
                comment_object.net_rshares -= itr.rshares;
                comment_object.net_rshares += rshares;
            });

            _db.modify(comment, comment_object => {
                comment_object.total_vote_weight -= itr.weight;
            });

            _db.modify(itr, comment_vote_object => {
                comment_vote_object.rshares = rshares;
                comment_vote_object.vote_percent = vote_raw.weight;
                comment_vote_object.last_update = _db.head_block_time();
                comment_vote_object.weight = 0;
            });
        }
    }
}

module.exports = VotePendingPayout;
