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
        score: {
            type: Number,
        },
    },
    {
        index: [
            {
                // Search
                fields: {
                    score: -1,
                },
            },
        ],
    }
);
