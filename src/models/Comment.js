const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Comment',
    {
        id: {
            userId: {
                type: String,
                required: true,
            },
            permlink: {
                type: String,
                required: true,
            },
            refBlockNum: {
                type: String,
                required: true,
            },
        },
        postId: {
            userId: {
                type: String,
            },
            permlink: {
                type: String,
            },
            refBlockNum: {
                type: String,
            },
        },
        parentCommentId: {
            userId: {
                type: String,
            },
            permlink: {
                type: String,
            },
            refBlockNum: {
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
            upUserIds: {
                type: [String],
            },
            downUserIds: {
                type: [String],
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
                    'id.userId': 1,
                    'id.permlink': 1,
                    'id.refBlockNum': 1,
                },
                options: {
                    unique: true,
                },
            },
            // Post comments, sorted by time
            {
                fields: {
                    'postId.userId': 1,
                    'postId.permlink': 1,
                    'postId.refBlockNum': 1,
                    'meta.time': 1,
                },
                options: {
                    unique: true,
                },
            },
            // User comments, sorted by time
            {
                fields: {
                    'id.userId': 1,
                    'meta.time': 1,
                },
            },
        ],
    }
);
