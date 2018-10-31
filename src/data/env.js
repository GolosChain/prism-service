// Описание переменных окружения смотри в Readme.
const env = process.env;

module.exports = {
    GLS_MAX_FEED_LIMIT: env.GLS_MAX_FEED_LIMIT || 100,
    GLS_CHAIN_PROPS_INTERVAL: env.GLS_CHAIN_PROPS_INTERVAL || 60000,
    GLS_FEED_PRICE_INTERVAL: env.GLS_FEED_PRICE_INTERVAL || 60000,
};
