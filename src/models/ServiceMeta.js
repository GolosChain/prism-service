const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel('ServiceMeta', {
    isGenesisApplied: {
        type: Boolean,
        default: false,
    },
});
