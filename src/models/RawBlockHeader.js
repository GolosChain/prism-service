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
            default: false
        }
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
