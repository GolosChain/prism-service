// Описание переменных окружения смотри в Readme.
const env = process.env;

module.exports = {
    GLS_MAX_FEED_LIMIT: env.GLS_MAX_FEED_LIMIT || 100,
};
