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
        percent: {
            type: Number,
        },
        lastUpdateInBlockchain: {
            type: Date,
        },
    },
    {
        index: [
            {
                fields: {
                    toUser: 1,
                    permlink: 1,
                },
            },
        ],
    }
);
