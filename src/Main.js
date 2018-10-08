const core = require('gls-core-service');
const stats = core.utils.statsClient;
const BasicMain = core.services.BasicMain;
const MongoDB = core.services.MongoDB;
const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');

class Main extends BasicMain {
    constructor() {
        super(stats, env);

        this.addNested(new MongoDB(), new Prism(), new Connector());
    }
}

module.exports = Main;
