const core = require('gls-core-service');
const stats = core.statsClient;
const BasicMain = core.services.BasicMain;
const MongoDB = core.service.MongoDB;
const env = require('./env');

class Main extends BasicMain {
    constructor() {
        super(stats, env);

        // TODO -

        this.addNested(new MongoDB());
    }
}

module.exports = Main;
