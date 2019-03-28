const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Tag',
    {
        communityId: {
            type: String,
        },
        name: {
            type: String,
        },
        count: {
            type: Number,
        },
        score: {
            type: Number,
        },
    },
    {
        index: [
            {
                // Search
                fields: {
                    communityId: 1,
                    name: 1,
                },
            },
            {
                // Ordering
                fields: {
                    score: -1,
                },
            },
        ],
    }
);
