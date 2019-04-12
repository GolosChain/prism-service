const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Leader',
    {
        communityId: {
            type: String,
        },
        accountId: {
            type: String,
        },
        rating: {
            type: Number,
            default: 0,
        },
    },
    {
        index: [
            {
                // Top
                fields: {
                    communityId: 1,
                    accountId: 1,
                    rating: -1,
                },
            },
        ],
    }
);
