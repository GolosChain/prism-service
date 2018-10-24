const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Post',
    {
        parentPermlink: {
            type: String,
        },
        author: {
            type: String,
        },
        permlink: {
            type: String,
        },
        title: {
            type: String,
        },
        body: {
            type: String,
        },
        isPayoutDone: {
            type: Boolean,
            default: false,
        },
        finalPayout: {
            type: Number,
        },
        beneficiaries: {
            type: [
                {
                    name: {
                        type: String,
                    },
                    weight: {
                        type: Number,
                    },
                },
            ],
        },
        allowCurationRewards: {
            type: Boolean,
            default: true,
        },
        gbgPercent: {
            type: Number,
        },
        payoutDate: {
            type: Date,
        },
        rewardWeight: {
            type: Number,
        },
        maxAcceptedPayout: {
            type: Number,
        },
        netRshares: {
            type: Number,
        },
        childrenRshares2: {
            type: Number,
        },
        createdInBlockchain: {
            type: Date,
        },
        pending: {
            authorPayoutGests: {
                type: Number,
            },
            curatorPayout: {
                type: Number,
            },
            curatorPayoutGests: {
                type: Number,
            },
            payout: {
                type: Number,
            },
            benefactorPayout: {
                type: Number,
            },
            benefactorPayoutGests: {
                type: Number,
            },
            authorPayoutGolos: {
                type: Number,
            },
            authorPayoutGbg: {
                type: Number,
            },
            authorPayout: {
                type: Number,
            },
        },
        totalWeight: {
            type: Number,
        },
        totalRealWeight: {
            type: Number,
        },
        rawJsonMetadata: {
            type: String,
        },
        commentsCount: {
            type: Number,
            default: 0,
        },
        metadata: {
            app: {
                type: String,
            },
            format: {
                type: String,
            },
            tags: {
                type: [String],
            },
            images: {
                type: [String],
            },
            links: {
                type: [String],
            },
            users: {
                type: [String],
            },
        },
    },
    {
        index: [
            {
                fields: {
                    permlink: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    author: 1,
                },
            },
        ],
    }
);
