const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'CommunitySettings',
    {
        communityId: {
            type: String,
            required: true,
        },
        contractType: {
            type: String,
            required: true,
        },
        structureName: {
            type: String,
            required: true,
        },
        data: {
            type: Object,
            required: true,
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    communityId: 1,
                    contractName: 1,
                    structureName: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
