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
