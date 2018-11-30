const core = require('gls-core-service');
const BigNum = core.types.BigNum;
const MongoDB = core.services.MongoDB;
const BigNumType = MongoDB.type.MongoBigNum;

const BLOCKCHAIN_DEFAULT_MAX_ACCEPTED_PAYOUT = new BigNum('1000000.000');
const BLOCKCHAIN_DEFAULT_GBG_PERCENT = new BigNum('5000');
const GOLOS_100_PERCENT = new BigNum(10000);

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
            full: {
                type: String,
            },
            cut: {
                type: String,
            },
        },
        createdInBlockchain: {
            type: Date,
        },
        promote: {
            balance: {
                type: BigNumType,
                default: new BigNum('0'),
            },
        },
        bandwidth: {
            lastUpdate: {
                type: Date,
            },
            averageBandwidth: {
                type: BigNumType,
                default: GOLOS_100_PERCENT,
            },
        },
        options: {
            maxAcceptedPayout: {
                type: BigNumType,
                default: BLOCKCHAIN_DEFAULT_MAX_ACCEPTED_PAYOUT,
            },
            gbgPercent: {
                type: BigNumType,
                default: BLOCKCHAIN_DEFAULT_GBG_PERCENT,
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
            rewardWeight: {
                type: BigNumType,
                default: GOLOS_100_PERCENT,
            },
            netRshares: {
                type: BigNumType,
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
                    default: new BigNum('0'),
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
                    default: new BigNum('0'),
                },
            },
        },
        vote: {
            likes: {
                type: Object,
            },
            dislikes: {
                type: Object,
            },
            rshares: {
                type: BigNumType,
            },
            totalWeight: {
                type: BigNumType,
            },
            totalRealWeight: {
                type: BigNumType,
            },
        },
        comments: {
            count: {
                type: Number,
                default: 0,
            },
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
    },
    {
        index: [
            {
                fields: {
                    author: 1,
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
