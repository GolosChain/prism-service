const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'CommunitySettings',
    {
        communityId: {
            type: String,
            required: true,
        },
        contractName: {
            type: String,
            required: true,
        },
        actionName: {
            type: String,
            required: true,
        },
        structureName: {
            type: String,
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
