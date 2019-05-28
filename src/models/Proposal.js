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
        expiration: {
            type: Date,
            required: true,
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
    },
    {
        index: [
            {
                // Search for change
                fields: {
                    communityId: 1,
                },
            },
        ],
    }
);
