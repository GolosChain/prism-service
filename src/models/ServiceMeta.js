const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel('ServiceMeta', {
    lastBlockNum: {
        type: Number,
    },
    inRevertProcess: {
        type: Boolean,
    },
});
