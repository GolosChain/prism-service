const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;
const BigNumType = MongoDB.type.MongoBigNum;

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
            type: BigNumType,
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
            type: BigNumType,
        },
        payoutDate: {
            type: Date,
        },
        rewardWeight: {
            type: BigNumType,
        },
        maxAcceptedPayout: {
            type: BigNumType,
        },
        netRshares: {
            type: BigNumType,
        },
        createdInBlockchain: {
            type: Date,
        },
        pending: {
            authorPayoutGests: {
                type: BigNumType,
            },
            curatorPayout: {
                type: BigNumType,
            },
            curatorPayoutGests: {
                type: BigNumType,
            },
            payout: {
                type: BigNumType,
                default: 0,
            },
            benefactorPayout: {
                type: BigNumType,
            },
            benefactorPayoutGests: {
                type: BigNumType,
            },
            authorPayoutGolos: {
                type: BigNumType,
            },
            authorPayoutGbg: {
                type: BigNumType,
            },
            authorPayout: {
                type: BigNumType,
            },
        },
        voteRshares: {
            type: BigNumType,
        },
        totalVoteWeight: {
            type: BigNumType,
        },
        totalVoteRealWeight: {
            type: BigNumType,
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
