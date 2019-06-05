const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Fork',
    {
        blockNum: {
            type: Number,
            required: true,
        },
        stack: {
            type: [
                {
                    type: {
                        type: String,
                        enum: [], // TODO -
                    },
                    className: {
                        type: String,
                    },
                    data: {
                        type: Object,
                    },
                },
            ],
        },
    },
    {
        schema: {
            strict: false,
        },
        index: [
            {
                fields: {
                    blockNum: -1,
                },
            },
        ],
    }
);
