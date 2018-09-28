const core = require('gls-core-service');
const stats = core.utils.statsClient;
const BasicMain = core.services.BasicMain;
const MongoDB = core.services.MongoDB;
const env = require('./env');

class Main extends BasicMain {
    constructor() {
        super(stats, env);

        // TODO -

        this.addNested(new MongoDB());
    }
}

module.exports = Main;
