const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Vote',
    {
        fromUser: {
            type: String,
        },
        toUser: {
            type: String,
        },
        permlink: {
            type: String,
        },
        weight: {
            type: Number,
        },
    },
    {
        index: [
            // TODO -
        ],
    }
);
