const core = require('gls-core-service');
const stats = core.utils.statsClient;
const BasicMain = core.services.BasicMain;
const MongoDB = core.services.MongoDB;
const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');
const Cleaner = require('./services/Cleaner');

class Main extends BasicMain {
    constructor() {
        super(stats, env);

        const mongoDB = new MongoDB();
        const connector = new Connector();
        const cleaner = new Cleaner();
        const prism = new Prism();

        this.addNested(mongoDB, cleaner, prism, connector);
    }
}

module.exports = Main;
