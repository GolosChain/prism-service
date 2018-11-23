const core = require('gls-core-service');
const BigNum = core.types.BigNum;

module.exports = {
    POST_BODY_CUT_LENGTH: 600,
    BLOCKCHAIN_DEFAULT_MAX_ACCEPTED_PAYOUT: new BigNum('1000000.000'),
    BLOCKCHAIN_DEFAULT_GBG_PERCENT: new BigNum('5000'),
};
