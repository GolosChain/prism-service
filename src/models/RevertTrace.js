const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'RevertTrace',
    {
        blockNum: {
            type: Number,
            required: true,
        },
        stack: {
            type: [
                {
                    command: {
                        type: String,
                        enum: ['swap', 'create'],
                    },
                    blockBody: {
                        type: Object,
                    },
                },
            ],
        },
    },
    {
        schema: {
            strict: false,
            capped: {
                size: 8 * 1024 ** 3, // 8GB reserve
                max: env.GLS_DELEGATION_ROUND_LENGTH * 3,
                autoIndexId: true,
            },
        },
    }
);
