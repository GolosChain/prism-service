const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Profile',
    {
        userId: {
            type: String,
            required: true,
        },
        username: {
            type: String,
        },
        personal: {
            cyber: {
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
            gls: {
                name: String,
                gender: String,
                about: String,
                location: String,
                website: String,
                profileImage: String,
                coverImage: String,
                social: String,
            },
        },
        subscriptions: {
            userIds: {
                type: [String],
                default: [],
            },
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
                    userId: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
