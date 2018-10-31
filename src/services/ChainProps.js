const moment = require('moment');
const core = require('gls-core-service');
const BlockChainValues = core.utils.BlockChainValues;
const BigNum = core.types.BigNum;
const Abstract = require('./AbstractPropsCache');
const env = require('../data/env');

class ChainProps extends Abstract {
    async start() {
        await super.start(env.GLS_CHAIN_PROPS_INTERVAL);
    }

    async _extract() {
        const raw = await BlockChainValues.getDynamicGlobalProperties();

        this._currentValues = {
            headBlockNumber: new BigNum(raw.head_block_number),
            headBlockId: raw.head_block_id,
            time: moment(raw.time),
            currentWitness: raw.current_witness,
            totalPow: new BigNum(raw.total_pow),
            numPowWitnesses: new BigNum(raw.num_pow_witnesses),
            virtualSupply: new BigNum(raw.virtual_supply),
            currentSupply: new BigNum(raw.current_supply),
            confidentialSupply: new BigNum(raw.confidential_supply),
            currentGbgSupply: new BigNum(raw.current_sbd_supply),
            confidentialGbgSupply: new BigNum(raw.confidential_sbd_supply),
            totalVestingFundGolos: new BigNum(raw.total_vesting_fund_steem),
            totalVestingShares: new BigNum(raw.total_vesting_shares),
            totalRewardFundGolos: new BigNum(raw.total_reward_fund_steem),
            totalRewardShares2: new BigNum(raw.total_reward_shares2),
            gbgInterestRate: new BigNum(raw.sbd_interest_rate),
            gbgPrintRate: new BigNum(raw.sbd_print_rate),
            averageBlockSize: new BigNum(raw.average_block_size),
            maximumBlockSize: new BigNum(raw.maximum_block_size),
            currentSlot: new BigNum(raw.current_aslot),
            recentSlotsFilled: new BigNum(raw.recent_slots_filled),
            participationCount: new BigNum(raw.participation_count),
            lastIrreversibleBlockNum: new BigNum(raw.last_irreversible_block_num),
            maxVirtualBandwidth: new BigNum(raw.max_virtual_bandwidth),
            currentReserveRatio: new BigNum(raw.current_reserve_ratio),
            voteRegenerationPerDay: new BigNum(raw.vote_regeneration_per_day),
        };
    }
}

module.exports = ChainProps;
