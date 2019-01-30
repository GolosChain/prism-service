const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Profile',
    {
        id: {
            type: String,
        },
        name: {
            type: String,
        },
        personalization: {
            avatarUrl: {
                type: String,
            },
            coverUrl: {
                type: String,
            },
            biography: {
                type: String,
            },
        },
        community: {
            subscriptionsList: {
                type: [String],
            },
        },
        registration: {
            time: {
                type: Date,
            },
        },
        content: {
            postsCount: {
                type: Number,
            },
        },
        messenger: {
            facebookMessenger: {
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
