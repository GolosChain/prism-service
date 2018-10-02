const env = require('../../data/env');
const Abstract = require('./Abstract');
const Post = require('../../models/Post');

class Feed extends Abstract {
    async handle({ type, fromId = null, limit = 20 }) {
        limit = +limit;

        if (!limit || limit <= 0 || limit > env.GLS_MAX_FEED_LIMIT) {
            limit = 20;
        }

        switch (type) {
            case 'natural':
                return await this._getNaturalFeed(fromId, limit);
            case 'popular':
                return await this._getPopularFeed(fromId, limit);
            case 'actual':
                return await this._getActualFeed(fromId, limit);
            case 'promo':
                return await this._getPromoFeed(fromId, limit);
            default:
                throw { code: 12001, message: 'Invalid feed type' };
        }
    }

    async _getNaturalFeed(fromId, limit) {
        let query = {};

        if (fromId) {
            query = { $lt: fromId };
        }

        let data = await Post.find(query, { __v: false }, { limit, lean: true, sort: { _id: -1 } });

        if (!data) {
            data = [];
        }

        return {
            total: data.length,
            data,
        };
    }

    _getPopularFeed(fromId, limit) {
        // TODO -
    }

    _getActualFeed(fromId, limit) {
        // TODO -
    }

    _getPromoFeed(fromId, limit) {
        // TODO -
    }
}

module.exports = Feed;
