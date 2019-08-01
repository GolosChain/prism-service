const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Profile',
    {
        userId: {
            type: String,
            required: true,
        },
        usernames: {
            // app -> name
            type: Object,
            default: {},
        },
        isGenesisUser: {
            type: Boolean,
            default: false,
        },
        chargersRaw: {
            votes: {
                value: {
                    type: Number,
                    default: 100,
                },
                lastUpdated: {
                    type: Date,
                    default: Date.now(),
                },
            },
            posts: {
                value: {
                    type: Number,
                    default: 100,
                },
                lastUpdated: {
                    type: Date,
                    default: Date.now(),
                },
            },
            comments: {
                value: {
                    type: Number,
                    default: 100,
                },
                lastUpdated: {
                    type: Date,
                    default: Date.now(),
                },
            },
            postbw: {
                value: {
                    type: Number,
                    default: 100,
                },
                lastUpdated: {
                    type: Date,
                    default: Date.now(),
                },
            },
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
                    vkontakte: {
                        type: String,
                    },
                    facebook: {
                        type: String,
                    },
                    instagram: {
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
                name: {
                    type: String,
                },
                gender: {
                    type: String,
                },
                email: {
                    type: String,
                },
                about: {
                    type: String,
                },
                location: {
                    type: String,
                },
                website: {
                    type: String,
                },
                avatarUrl: {
                    type: String,
                },
                coverUrl: {
                    type: String,
                },
                contacts: {
                    vkontakte: {
                        type: String,
                    },
                    facebook: {
                        type: String,
                    },
                    instagram: {
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
        },
        subscriptions: {
            userIds: {
                type: [String],
                default: [],
            },
            usersCount: {
                type: Number,
                default: 0,
            },
            communityIds: {
                type: [String],
                default: [],
            },
            communitiesCount: {
                type: Number,
                default: 0,
            },
        },
        subscribers: {
            userIds: {
                type: [String],
                default: [],
            },
            usersCount: {
                type: Number,
                default: 0,
            },
            communityIds: {
                type: [String],
                default: [],
            },
            communitiesCount: {
                type: Number,
                default: 0,
            },
        },
        registration: {
            time: {
                type: Date,
            },
        },
        stats: {
            reputation: {
                type: Number,
                default: 0,
            },
            postsCount: {
                type: Number,
                default: 0,
            },
            commentsCount: {
                type: Number,
                default: 0,
            },
        },
        leaderIn: {
            type: [String],
            default: [],
        },
        isGolosVestingOpened: {
            type: Boolean,
            default: false,
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
            // Golos user search
            {
                fields: {
                    'usernames.gls': 1,
                },
            },
            // Cyber user search
            {
                fields: {
                    'usernames.cyber': 1,
                },
            },
        ],
    }
);
