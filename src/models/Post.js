const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Post',
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
            wilson: {
                hot: {
                    type: Number,
                    default: 0,
                },
                trending: {
                    type: Number,
                    default: 0,
                },
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
                },
                sharesFn: {
                    type: Number,
                },
                sumCuratorSw: {
                    type: Number,
                },
                benefactorPercents: {
                    type: [Number],
                },
                tokenProp: {
                    type: Number,
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
            // Shares feed
            {
                fields: {
                    'payout.rShares': 1,
                },
            },
            // Actual feed
            {
                fields: {
                    'stats.wilson.hot': 1,
                },
            },
            // Popular feed
            {
                fields: {
                    'stats.wilson.trending': 1,
                },
            },
        ],
    }
);
