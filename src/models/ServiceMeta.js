const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel('ServiceMeta', {
    isGenesisApplied: {
        type: Boolean,
        default: false,
    },
    lastBlockNum: {
        type: Number,
        default: 0,
    },
    lastBlockTime: {
        type: Date,
        default: null,
    },
    lastBlockSequence: {
        type: Number,
        default: 0,
    },
    inRevertProcess: {
        type: Boolean,
        default: false,
    },
});
