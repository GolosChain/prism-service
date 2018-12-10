const env = require('../../data/env');
const Abstract = require('./Abstract');
const Post = require('../../models/Post');
const User = require('../../models/User');

class Feed extends Abstract {
    async handle({ user, type, tags = [], fromId = null, limit = 20 }) {
        [limit, tags] = this._normalizeRequestParams(limit, tags);

        switch (type) {
            case 'natural':
                return await this._getNaturalFeed({ fromId, limit, tags });
            case 'popular':
                return await this._getPopularFeed({ fromId, limit, tags });
            case 'actual':
                return await this._getActualFeed({ fromId, limit, tags });
            case 'promo':
                return await this._getPromoFeed({ fromId, limit, tags });
            case 'personal':
                return await this._getPersonalFeed({ fromId, limit, tags, user });
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

    async _getNaturalFeed({ fromId, limit, tags }) {
        const query = {};

        this._injectQueryParams(query, { fromId, tags });

        const data = await Post.find(
            query,
            { __v: false },
            { limit, lean: true, sort: { _id: -1 } }
        );

        return {
            total: data.length,
            data: data || [],
        };
    }

    async _getPopularFeed({ fromId, limit, tags }) {
        // TODO -
    }

    async _getActualFeed({ fromId, limit, tags }) {
        // TODO -
    }

    async _getPromoFeed({ fromId, limit, tags }) {
        const payoutDate = new Date(Date.now() - env.GLS_PAYOUT_RANGE);
        const query = { createdInBlockchain: { $gt: payoutDate } };

        this._injectQueryParams(query, { fromId, tags });

        const data = await Post.find(
            query,
            { __v: false },
            { limit, lean: true, sort: { 'promote.balance': -1 } }
        );

        return {
            total: data.length,
            data: data || [],
        };
    }

    async _getPersonalFeed({ fromId, limit, user, tags }) {
        const query = {};

        this._injectQueryParams(query, { fromId, tags });

        const userModel = await User.findOne({ name: user }, { following: true });

        if (!userModel || !userModel.following || !userModel.following.length) {
            return {
                total: 0,
                data: [],
            };
        }

        query.author = { $in: userModel.following };

        const data = await Post.find(
            query,
            { __v: false },
            { limit, lean: true, sort: { _id: -1 } }
        );

        return {
            total: data.length,
            data: data || [],
        };
    }

    _injectQueryParams(query, { fromId, tags }) {
        if (fromId) {
            query._id = { $lt: fromId };
        }

        if (tags.length) {
            query['metadata.tags'] = { $in: tags };
        }
    }
}

module.exports = Feed;
