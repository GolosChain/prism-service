const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'HashTag',
    {
        communityId: {
            type: String,
        },
        name: {
            type: String,
        },
        count: {
            type: Number,
            default: 0,
        },
    },
    {
        index: [
            {
                // Search one
                fields: {
                    communityId: 1,
                    name: 1,
                },
            },
            {
                // Ordering
                fields: {
                    communityId: 1,
                    count: -1,
                },
            },
        ],
    }
);
