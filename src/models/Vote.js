const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;
const BigNumType = core.types.MongoBigNum;

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
            type: BigNumType,
        },
        percent: {
            type: BigNumType,
        },
        lastUpdateInBlockchain: {
            type: Date,
        },
    },
    {
        index: [
            {
                fields: {
                    fromUser: 1,
                    toUser: 1,
                    permlink: 1,
                },
            },
        ],
    }
);
