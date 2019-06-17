const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Fork',
    {
        blockNum: {
            type: Number,
            required: true,
        },
        blockTime: {
            type: Date,
            required: true,
        },
        blockSequence: {
            type: Number,
            required: true,
        },
        stack: {
            type: [
                {
                    type: {
                        type: String,
                        enum: ['swap', 'update', 'create', 'remove'],
                        required: true,
                    },
                    className: {
                        type: String,
                        required: true,
                    },
                    documentId: {
                        type: MongoDB.mongoTypes.ObjectId,
                        required: true,
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
