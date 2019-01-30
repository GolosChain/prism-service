const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');
const Model = require('../../models/Post');

class Feed extends BasicController {
    async getFeed({ type = 'byTime', nextFrom = null, nextAfter = null, limit = 10 }) {
        // TODO Personal feed, user feed, community feed
        // TODO Change type to another name (sorting?)
        // TODO User likes detect

        if (limit > env.GLS_MAX_FEED_LIMIT) {
            limit = env.GLS_MAX_FEED_LIMIT;
        }

        switch (type) {
            case 'byTime':
            default:
                return await this._getFeedByTime(nextFrom, nextAfter, limit);
        }
    }

    async _getFeedByTime(nextFrom, nextAfter, limit) {
        const query = {};

        if (nextFrom) {
            nextFrom = Number(nextFrom);
            query.meta = {};
            query.meta.time = { $gt: nextFrom - 1 };
        } else if (nextAfter) {
            nextAfter = Number(nextAfter);
            query.meta = {};
            query.meta.time = { $gt: nextAfter };
        }

        const result = await Model.find(
            query,
            { _id: false, versionKey: false, 'content.body.full': false }, // TODO Check feed projection
            { limit }
        );

        // TODO Handle result/404
    }
}

module.exports = Feed;
