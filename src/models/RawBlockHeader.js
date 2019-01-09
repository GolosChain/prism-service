const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'RawBlockHeader',
    {
        blockNum: {
            type: Number,
            required: true,
        },
        dispersed: {
            type: Boolean,
            default: false,
        },
    },
    {
        index: [
            // Search
            {
                fields: {
                    blockNum: -1,
                },
                options: {
                    unique: true,
                },
            },
            // Last dispersed search
            {
                fields: {
                    blockNum: -1,
                    dispersed: 1,
                },
            },
        ],
        schema: {
            strict: false,
        },
    }
);
