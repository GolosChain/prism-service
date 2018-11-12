const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'RawBlock',
    {
        blockNum: {
            type: Number,
            required: true,
        },
        corrupted: {
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
            // Corrupted restore
            {
                fields: {
                    corrupted: -1,
                },
                // Optimization for mongoose
                options: {
                    sparse: true,
                },
            },
        ],
        schema: {
            strict: false,
        },
    }
);
