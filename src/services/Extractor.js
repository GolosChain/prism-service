const core = require('gls-core-service');
const Logger = core.utils.Logger;
const stats = core.statsClient;
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const BlockSubscribeRestore = core.services.BlockSubscribeRestore;
const env = require('../env');

class Cleaner extends BasicService {
    async start() {
        // TODO -
    }

    async stop() {
        // TODO -
    }

    async restore() {
        // TODO -
    }
}

module.exports = Cleaner;
