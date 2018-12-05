const core = require('gls-core-service');
const stats = core.utils.statsClient;
const BasicMain = core.services.BasicMain;
const MongoDB = core.services.MongoDB;
const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');
const Cleaner = require('./services/Cleaner');
const ChainProps = require('./services/ChainProps');
const FeedPrice = require('./services/FeedPrice');
const PayoutFinalizer = require('./services/PayoutFinalizer');

class Main extends BasicMain {
    constructor() {
        super(stats, env);

        const mongoDB = new MongoDB();
        const connector = new Connector();
        const cleaner = new Cleaner();
        const chainProps = new ChainProps();
        const feedPrice = new FeedPrice();
        const payoutFinalizer = new PayoutFinalizer();
        const prism = new Prism({ chainPropsService: chainProps, feedPriceService: feedPrice });

        this.addNested(mongoDB, cleaner, chainProps, feedPrice, payoutFinalizer, prism, connector);
    }
}

module.exports = Main;
