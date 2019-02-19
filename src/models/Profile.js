const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Profile',
    {
        id: {
            type: String,
            required: true,
        },
        username: {
            type: String,
        },
        personal: {
            avatarUrl: {
                type: String,
            },
            coverUrl: {
                type: String,
            },
            biography: {
                type: String,
            },
            contacts: {
                facebook: {
                    type: String,
                },
                telegram: {
                    type: String,
                },
                whatsApp: {
                    type: String,
                },
                weChat: {
                    type: String,
                },
            },
        },
        subscriptions: {
            communityIds: {
                type: [String],
                default: [],
            },
        },
        registration: {
            time: {
                type: Date,
            },
        },
        stats: {
            postsCount: {
                type: Number,
                default: 0,
            },
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    id: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
