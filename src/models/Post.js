const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Post',
    {
        repost: {
            isRepost: {
                type: Boolean,
                default: false,
            },
            userId: {
                type: String,
            },
            body: {
                raw: {
                    type: String,
                },
            },
        },
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
                            src: {
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
            tags: {
                type: [String],
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
        votes: {
            upVotes: {
                type: [
                    {
                        userId: {
                            type: String,
                        },
                        weight: {
                            type: Number,
                        },
                    },
                ],
                default: [],
            },
            upCount: {
                type: Number,
                default: 0,
            },
            downVotes: {
                type: [
                    {
                        userId: {
                            type: String,
                        },
                        weight: {
                            type: Number,
                        },
                    },
                ],
                default: [],
            },
            downCount: {
                type: Number,
                default: 0,
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
                        type: Number,
                        default: 0,
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
                vesting: {
                    value: {
                        type: Number,
                        default: 0,
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
            },
            curator: {
                vesting: {
                    value: {
                        type: Number,
                        default: 0,
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
            },
            benefactor: {
                vesting: {
                    value: {
                        type: Number,
                        default: 0,
                    },
                    name: {
                        type: String,
                        default: null,
                    },
                },
            },
            meta: {
                rewardWeight: {
                    type: Number,
                    default: 10000,
                },
                sharesFn: {
                    type: Number,
                    default: 0,
                },
                sumCuratorSw: {
                    type: Number,
                    default: 0,
                },
                benefactorPercents: {
                    type: [Number],
                    default: [0],
                },
                tokenProp: {
                    type: Number,
                    default: 0,
                },
            },
        },
        meta: {
            time: {
                type: Date,
                default: new Date(),
            },
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    'repost.isRepost': 1,
                    'contentId.userId': 1,
                    'contentId.permlink': 1,
                },
            },
            // Community/Subscriptions feed
            // ...with sort by time
            {
                fields: {
                    communityId: 1,
                    'meta.time': -1,
                },
            },
            // By user feed
            // ...with sort by time
            {
                fields: {
                    'contentId.userId': 1,
                    'meta.time': -1,
                },
            },
            {
                fields: {
                    'repost.userId': 1,
                    'meta.time': -1,
                },
            },
            // Shares feed
            {
                fields: {
                    'repost.isRepost': 1,
                    'stats.rShares': 1,
                },
            },
            // Actual feed
            {
                fields: {
                    'repost.isRepost': 1,
                    'stats.hot': 1,
                },
            },
            // Popular feed
            {
                fields: {
                    'repost.isRepost': 1,
                    'stats.trending': 1,
                },
            },
        ],
    }
);
