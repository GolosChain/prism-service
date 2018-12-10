const core = require('gls-core-service');
const BigNum = core.types.BigNum;
const BigNumType = core.types.MongoBigNum;
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'User',
    {
        name: {
            type: String,
            required: true,
        },
        metaName: {
            type: String,
        },
        profileImage: {
            type: String,
        },
        coverImage: {
            type: String,
        },
        about: {
            type: String,
        },
        location: {
            type: String,
        },
        website: {
            type: String,
        },
        pinnedPosts: {
            type: [String],
        },
        following: {
            type: [String],
        },
        votingPower: {
            type: BigNumType,
            default: new BigNum(10000),
        },
        lastVoteDate: {
            type: Date,
        },
        vesting: {
            original: {
                type: BigNumType,
                default: new BigNum(0),
            },
            delegatedFromAnother: {
                type: BigNumType,
                default: new BigNum(0),
            },
            delegatedFromAnotherMap: {
                type: Map,
                of: BigNumType,
            },
            delegatedToAnother: {
                type: BigNumType,
                default: new BigNum(0),
            },
        },
    },
    {
        index: [
            {
                fields: {
                    name: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
