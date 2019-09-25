const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;
const MongoBigNum = core.types.MongoBigNum;

module.exports = MongoDB.makeModel(
    'Pool',
    {
        communityId: {
            type: String,
            required: true,
        },
        funds: {
            name: {
                type: String,
            },
            value: {
                type: MongoBigNum,
            },
        },
        rShares: {
            type: MongoBigNum,
        },
        rSharesFn: {
            type: MongoBigNum,
        },
    },
    {
        index: [
            {
                // Default
                fields: {
                    communityId: 1,
                },
            },
        ],
    }
);
