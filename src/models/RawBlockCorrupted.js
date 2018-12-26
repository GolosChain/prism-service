const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel('RawBlockCorrupted', {
    blockNum: {
        type: Number,
        required: true,
    },
});
