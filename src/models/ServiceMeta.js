const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel('ServiceMeta', {
    lastBlockNum: {
        type: Number,
        default: 0,
    },
    inRevertProcess: {
        type: Boolean,
        default: false,
    },
});
