const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Leader',
    {
        communityId: {
            type: String,
        },
        userId: {
            type: String,
        },
        url: {
            type: String,
        },
        about: {
            type: String,
        },
        rShares: {
            type: Number,
            default: 0,
        },
        votes: {
            type: [String],
        },
    },
    {
        index: [
            {
                // Search
                fields: {
                    communityId: 1,
                    userId: 1,
                },
                options: {
                    unique: true,
                },
            },
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
