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
        createdInBlockchain: {
            type: Date,
        },
        rewardWeight: {
            type: BigNumType,
        },
        netRshares: {
            type: BigNumType,
        },
        commentOptions: {
            maxAcceptedPayout: {
                type: BigNumType,
            },
            gbgPercent: {
                type: BigNumType,
            },
            allowCurationRewards: {
                type: Boolean,
                default: true,
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
        },
        payout: {
            date: {
                type: Date,
            },
            isDone: {
                type: Boolean,
                default: false,
            },
            pending: {
                authorValue: {
                    type: BigNumType,
                },
                authorGolos: {
                    type: BigNumType,
                },
                authorGbg: {
                    type: BigNumType,
                },
                authorGests: {
                    type: BigNumType,
                },
                curatorValue: {
                    type: BigNumType,
                },
                curatorGests: {
                    type: BigNumType,
                },
                benefactorValue: {
                    type: BigNumType,
                },
                benefactorGests: {
                    type: BigNumType,
                },
                totalValue: {
                    type: BigNumType,
                    default: 0,
                },
            },
            final: {
                authorValue: {
                    type: BigNumType,
                },
                authorGolos: {
                    type: BigNumType,
                },
                authorGbg: {
                    type: BigNumType,
                },
                authorGests: {
                    type: BigNumType,
                },
                curatorValue: {
                    type: BigNumType,
                },
                curatorGests: {
                    type: BigNumType,
                },
                benefactorValue: {
                    type: BigNumType,
                },
                benefactorGests: {
                    type: BigNumType,
                },
                totalValue: {
                    type: BigNumType,
                    default: 0,
                },
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
        commentsCount: {
            type: Number,
            default: 0,
        },
        metadata: {
            rawJson: {
                type: String,
            },
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
        likes: {
            type: Object,
        },
        dislikes: {
            type: Object,
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
