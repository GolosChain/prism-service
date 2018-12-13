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
                getNaturalFeed: this._feed.handleNatural.bind(this._feed),
                getPopularFeed: this._feed.handlePopular.bind(this._feed),
                getActualFeed: this._feed.handleActual.bind(this._feed),
                getPromoFeed: this._feed.handlePromo.bind(this._feed),
                getPersonalFeed: this._feed.handlePersonal.bind(this._feed),
            },
        });
    }
}

module.exports = Connector;
