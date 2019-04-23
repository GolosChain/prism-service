const env = process.env;

module.exports = {
    NODE_OPTIONS: env.NODE_OPTIONS,
    GLS_MAX_FEED_LIMIT: Number(env.GLS_MAX_FEED_LIMIT) || 100,
    GLS_DELEGATION_ROUND_LENGTH: Number(env.GLS_DELEGATION_ROUND_LENGTH) || 21,
    GLS_REVERT_TRACE_CLEANER_INTERVAL: Number(env.GLS_REVERT_TRACE_CLEANER_INTERVAL) || 300000,
    GLS_CONTENT_PREVIEW_LENGTH: Number(env.GLS_CONTENT_PREVIEW_LENGTH) || 200,
    GLS_FEED_CACHE_INTERVAL: Number(env.GLS_FEED_CACHE_INTERVAL) || 300000,
    GLS_FEED_CACHE_TTL: Number(env.GLS_FEED_CACHE_TTL) || 28800000,
    GLS_FEED_CACHE_MAX_ITEMS: Number(env.GLS_FEED_CACHE_MAX_ITEMS) || 10000,
    GLS_FACADE_CONNECT: env.GLS_FACADE_CONNECT,
    GLS_MAX_HASH_TAG_SIZE: env.GLS_MAX_HASH_TAG_SIZE || 32,
    GLS_SEARCH_SYNC_TIMEOUT: Number(env.GLS_SEARCH_SYNC_TIMEOUT) || 1000,
    GLS_SEARCH_CONNECTION_STRING: env.GLS_SEARCH_CONNECTION_STRING,
    GLS_SEARCH_DELETE_TIMEOUT: Number(env.GLS_SEARCH_DELETE_TIMEOUT) || 1000 * 60 * 60,
};
