const env = require('../../data/env');
const Abstract = require('./Abstract');
const Post = require('../../models/Post');

class Feed extends Abstract {
    async handle({ type, tags = [], fromId = null, limit = 20 }) {
        [limit, tags] = this._normalizeRequestParams(limit, tags);

        switch (type) {
            case 'natural':
                return await this._getNaturalFeed(fromId, limit, tags);
            case 'popular':
                return await this._getPopularFeed(fromId, limit, tags);
            case 'actual':
                return await this._getActualFeed(fromId, limit, tags);
            case 'promo':
                return await this._getPromoFeed(fromId, limit, tags);
            default:
                throw { code: 12001, message: 'Invalid feed type' };
        }
    }

    _normalizeRequestParams(limit, tags) {
        limit = +limit;

        if (!limit || limit <= 0 || limit > env.GLS_MAX_FEED_LIMIT) {
            limit = 20;
        }

        if (!Array.isArray(tags)) {
            tags = [];
        }

        return [limit, tags];
    }

    async _getNaturalFeed(fromId, limit, tags) {
        const query = {};

        if (fromId) {
            query._id = { $lt: fromId };
        }

        if (tags.length) {
            query['metadata.tags'] = { $in: tags };
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

    _getPopularFeed(fromId, limit, tags) {
        // TODO -
    }

    _getActualFeed(fromId, limit, tags) {
        // TODO -
    }

    _getPromoFeed(fromId, limit, tags) {
        // TODO -
    }
}

module.exports = Feed;
