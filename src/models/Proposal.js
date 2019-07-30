const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Proposal',
    {
        communityId: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        proposalId: {
            type: String,
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        // Используется только для контракта vesting
        symbol: {
            type: String,
            default: null,
        },
        blockTime: {
            type: Date,
            required: true,
        },
        expiration: {
            type: Date,
            required: true,
        },
        executer: {
            type: String,
        },
        isExecuted: {
            type: Boolean,
            required: true,
        },
        executedBlockTime: {
            type: Date,
        },
        changes: {
            type: [
                {
                    structureName: {
                        type: String,
                        required: true,
                    },
                    values: {
                        type: Object,
                        required: true,
                    },
                },
            ],
            required: true,
        },
        approves: {
            type: [
                {
                    userId: {
                        type: String,
                        required: true,
                    },
                    permission: {
                        type: String,
                        required: true,
                    },
                    isSigned: {
                        type: Boolean,
                        default: false,
                    },
                },
            ],
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    communityId: 1,
                    isExecuted: -1,
                    blockTime: -1,
                },
            },
            {
                fields: {
                    userId: 1,
                    proposalId: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
