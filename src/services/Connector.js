const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const Feed = require('../controllers/connector/Feed');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._feed = new Feed();
    }

    async start() {
        await super.start({
            serverRoutes: {
                getFeed: this._feed.handle.bind(this._feed),
            },
        });
    }
}

module.exports = Connector;
