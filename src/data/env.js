// Описание переменных окружения смотри в Readme.
const env = process.env;

module.exports = {
    GLS_MAX_FEED_LIMIT: env.GLS_MAX_FEED_LIMIT || 100,
    GLS_CHAIN_PROPS_INTERVAL: env.GLS_CHAIN_PROPS_INTERVAL || 60000,
    GLS_FEED_PRICE_INTERVAL: env.GLS_FEED_PRICE_INTERVAL || 60000,
    GLS_RAW_RESTORE_THREADS: env.GLS_RAW_RESTORE_THREADS || 1000,
    GLS_RAW_RESTORE_END_VAL_SYNC_INTERVAL: env.GLS_RAW_RESTORE_END_VAL_SYNC_INTERVAL || 60000,
    GLS_RAW_CORRUPTED_RESTORE_TIMEOUT: env.GLS_RAW_CORRUPTED_RESTORE_TIMEOUT || 3000,
    GLS_DELEGATION_ROUND_LENGTH: env.GLS_DELEGATION_ROUND_LENGTH || 21,
};
