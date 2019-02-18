const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Post',
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
        communityId: {
            type: String,
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
            upUserIds: {
                type: [String],
            },
            downUserIds: {
                type: [String],
            },
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
                    'id.userId': 1,
                    'id.permlink': 1,
                    'id.refBlockNum': 1,
                },
                options: {
                    unique: true,
                },
            },
            // Community/Subscriptions feed
            // ...with sort by time
            {
                fields: {
                    'communityId': 1,
                    'meta.time': -1,
                },
            },
            // By user feed
            // ...with sort by time
            {
                fields: {
                    'id.userId': 1,
                    'meta.time': -1,
                },
            },
        ],
    }
);
