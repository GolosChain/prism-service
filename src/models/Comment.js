const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Comment',
    {
        id: {
            type: String,
            required: true,
        },
        post: {
            id: {
                type: String,
            },
            content: {
                title: {
                    type: String,
                },
            },
        },
        parentComment: {
            id: {
                type: String,
            },
            content: {
                body: {
                    preview: {
                        type: String,
                    },
                },
            },
        },
        user: {
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
            },
            metadata: {
                type: Object,
            },
        },
        payout: {
            rShares: {
                type: Number,
                default: 0,
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
            // Post comments, sorted by time
            {
                fields: {
                    'post.id': 1,
                    'meta.time': 1,
                },
            },
            // User comments, sorted by time
            {
                fields: {
                    'user.id': 1,
                    'meta.time': 1,
                },
            },
        ],
    }
);
