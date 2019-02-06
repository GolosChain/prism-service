const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Comment',
    {
        id: {
            type: String,
        },
        postId: {
            type: String,
        },
        parentCommentId: {
            type: String,
        },
        author: {
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
            // Post apply, sorted by time
            {
                fields: {
                    postId: 1,
                    'meta.time': 1,
                },
            },
        ],
    }
);
