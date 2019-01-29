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
        meta: {
            time: {
                type: Date,
            },
        },
        author: {
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
            },
        },
        votes: {
            upUserList: {
                type: [String],
            },
            downUserList: {
                type: [String],
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
