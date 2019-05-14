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
        },
        parent: {
            post: {
                contentId: {
                    userId: {
                        type: String,
                    },
                    permlink: {
                        type: String,
                    },
                },
            },
            comment: {
                contentId: {
                    userId: {
                        type: String,
                    },
                    permlink: {
                        type: String,
                    },
                },
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
                mobile: {
                    type: [
                        {
                            type: {
                                type: String,
                            },
                            content: {
                                type: String,
                            },
                        },
                    ],
                },
                raw: {
                    type: String,
                },
            },
            metadata: {
                type: Object,
            },
            embeds: {
                type: [
                    {
                        id: {
                            type: String,
                        },
                        type: {
                            type: String,
                        },
                        result: {
                            type: Object,
                        },
                    },
                ],
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
            upCount: {
                type: Number,
                default: 0,
            },
            downUserIds: {
                type: [String],
            },
            downCount: {
                type: Number,
                default: 0,
            },
        },
        meta: {
            time: {
                type: Date,
            },
        },
        ordering: {
            byTime: {
                type: String,
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
                },
                options: {
                    unique: true,
                },
            },
            // Post comments, sorted by time
            {
                fields: {
                    'parent.post.contentId.userId': 1,
                    'parent.post.contentId.permlink': 1,
                    'ordering.byTime': 1,
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
