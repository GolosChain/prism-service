const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Pool',
    {
        communityId: {
            type: String,
            required: true,
        },
        fundsValue: {
            type: Number,
        },
        rShares: {
            type: Number,
        },
        rSharesFn: {
            type: Number,
        },
    },
    {
        index: [
            {
                // Default
                fields: {
                    communityId: 1,
                },
            },
        ],
    }
);
