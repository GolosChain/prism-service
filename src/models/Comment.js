const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;
const MongoBigNum = core.types.MongoBigNum;
const BigNum = core.types.BigNum;

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
        communityId: {
            type: String,
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
        stats: {
            commentsCount: {
                type: Number,
                default: 0,
            },
            rShares: {
                type: Number,
                default: 0,
            },
            hot: {
                type: Number,
                default: 0,
            },
            trending: {
                type: Number,
                default: 0,
            },
        },
        payout: {
            done: {
                type: Boolean,
                default: false,
            },
            author: {
                token: {
                    value: {
                        type: MongoBigNum,
                        default: new BigNum(0),
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
                vesting: {
                    value: {
                        type: MongoBigNum,
                        default: new BigNum(0),
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
            },
            curator: {
                token: {
                    value: {
                        type: MongoBigNum,
                        default: new BigNum(0),
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
                vesting: {
                    value: {
                        type: MongoBigNum,
                        default: new BigNum(0),
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
            },
            benefactor: {
                token: {
                    value: {
                        type: MongoBigNum,
                        default: new BigNum(0),
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
                vesting: {
                    value: {
                        type: MongoBigNum,
                        default: new BigNum(0),
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
            },
            unclaimed: {
                token: {
                    value: {
                        type: MongoBigNum,
                        default: new BigNum(0),
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
                vesting: {
                    value: {
                        type: MongoBigNum,
                        default: new BigNum(0),
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
            },
            meta: {
                rewardWeight: {
                    type: MongoBigNum,
                    default: new BigNum(10000),
                },
                sharesFn: {
                    type: MongoBigNum,
                    default: new BigNum(0),
                },
                sumCuratorSw: {
                    type: MongoBigNum,
                    default: new BigNum(0),
                },
                benefactorPercents: {
                    type: [MongoBigNum],
                    default: [new BigNum(0)],
                },
                tokenProp: {
                    type: MongoBigNum,
                    default: new BigNum(0),
                },
                curatorsPercent: {
                    type: MongoBigNum,
                    default: new BigNum(0),
                },
            },
        },
        votes: {
            upVotes: {
                type: Array,
                default: [],
            },
            upCount: {
                type: Number,
                default: 0,
            },
            downVotes: {
                type: Array,
                default: [],
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
        nestedLevel: {
            type: Number,
            default: 1,
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
            },
            // Replies
            {
                fields: {
                    'parent.post.contentId.userId': 1,
                    'parent.comment.contentId.userId': 1,
                    'meta.time': 1,
                },
                options: {
                    sparse: true,
                    background: true,
                },
            },
            {
                fields: {
                    'parent.comment.contentId.userId': 1,
                    'parent.post.contentId.userId': 1,
                    'meta.time': 1,
                },
                options: {
                    sparse: true,
                    background: true,
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
            // Shares feed
            {
                fields: {
                    'stats.rShares': 1,
                },
            },
            // Actual feed
            {
                fields: {
                    'stats.hot': 1,
                },
            },
            // Popular feed
            {
                fields: {
                    'stats.trending': 1,
                },
            },
        ],
    }
);
