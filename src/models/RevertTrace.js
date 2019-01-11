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
                    modelBody: {
                        type: Object,
                    },
                    modelClassName: {
                        type: String,
                    },
                },
            ],
        },
    },
    {
        schema: {
            strict: false,
        },
    }
);
