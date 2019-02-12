const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Post',
    {
        id: {
            type: String,
            required: true,
        },
        user: {
            id: {
                type: String,
            },
            name: {
                type: String,
            },
        },
        community: {
            id: {
                type: String,
            },
            name: {
                type: String,
            },
            avatarUrl: {
                type: String,
            },
        },
        content: {
            title: {
                type: String,
            },
            body: {
                full: {
                    type: String,
                },
                preview: {
                    type: String,
                },
            },
            metadata: {
                type: Object,
            },
        },
        votes: {
            // Inner use only
            upUserIdList: {
                type: [String],
            },
            // Inner use only
            downUserIdList: {
                type: [String],
            },

            /*
            Extra fields:

            upByUser: {
                type: Boolean,
                default: false,
            },

            downByUser: {
                type: Boolean,
                default: false,
            },
             */
        },
        comments: {
            count: {
                type: Number,
                default: 0,
            },
        },
        payout: {
            rShares: {
                type: Number,
                default: 0,
            },
        },
        meta: {
            time: {
                type: Date,
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
            // Community/Subscriptions feed
            // ...with sort by time
            {
                fields: {
                    'community.id': 1,
                    'meta.time': -1,
                },
            },
            // By user feed
            // ...with sort by time
            {
                fields: {
                    'user.id': 1,
                    'meta.time': -1,
                },
            },
        ],
    }
);
