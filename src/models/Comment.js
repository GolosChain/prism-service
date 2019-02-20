const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Comment',
    {
        contentId: {
            userId: {
                type: String,
                required: true,
            },
            permlink: {
                type: String,
                required: true,
            },
            refBlockNum: {
                type: Number,
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
                type: Number,
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
                type: Number,
            },
        },
        content: {
            title: {
                type: String,
            },
            body: {
                preview: {
                    type: String,
                },
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
        ordering: {
            root: {
                type: Number,
            },
            child: {
                type: Number,
            },
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    'contentId.userId': 1,
                    'contentId.permlink': 1,
                    'contentId.refBlockNum': 1,
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
                    'ordering.root': 1,
                    'ordering.child': 1,
                },
                options: {
                    unique: true,
                    sparse: true,
                },
            },
            // User comments, sorted by time
            {
                fields: {
                    'contentId.userId': 1,
                    'meta.time': 1,
                },
            },
        ],
    }
);
