const env = require('../../data/env');
const Abstract = require('./Abstract');
const Post = require('../../models/Post');
const User = require('../../models/User');

class Feed extends Abstract {
    async handleNatural({ tags = [], afterId = null, limit = 20 }) {
        [limit, tags] = this._normalizeRequestParams(limit, tags);

        return await this._getNaturalFeed({ afterId, limit, tags });
    }

    async handlePopular({ tags = [], afterId = null, limit = 20 }) {
        [limit, tags] = this._normalizeRequestParams(limit, tags);

        return await this._getPopularFeed({ afterId, limit, tags });
    }

    async handleActual({ tags = [], afterId = null, limit = 20 }) {
        [limit, tags] = this._normalizeRequestParams(limit, tags);

        return await this._getActualFeed({ afterId, limit, tags });
    }

    async handlePromo({ tags = [], afterId = null, limit = 20 }) {
        [limit, tags] = this._normalizeRequestParams(limit, tags);

        return await this._getPromoFeed({ afterId, limit, tags });
    }

    async handlePersonal({ user, tags = [], afterId = null, limit = 20 }) {
        [limit, tags] = this._normalizeRequestParams(limit, tags);

        return await this._getPersonalFeed({ afterId, limit, tags, user });
    }

    _normalizeRequestParams(limit, tags) {
        limit = Number(limit);

        if (!limit || limit <= 0 || limit > env.GLS_MAX_FEED_LIMIT) {
            limit = 20;
        }

        if (!Array.isArray(tags)) {
            tags = [];
        }

        return [limit, tags];
    }

    async _getNaturalFeed({ afterId, limit, tags }) {
        const query = {};

        this._injectQueryParams(query, { afterId, tags });

        return await this._queryFeedWithAnnotate(query, { _id: -1 }, limit);
    }

    async _getPopularFeed({ afterId, limit, tags }) {
        const query = {};

        this._injectQueryParams(query, { afterId, tags });

        return await this._queryFeedWithAnnotate(query, { 'scoring.popular': -1 }, limit);
    }

    async _getActualFeed({ afterId, limit, tags }) {
        const query = {};

        this._injectQueryParams(query, { afterId, tags });

        return await this._queryFeedWithAnnotate(query, { 'scoring.actual': -1 }, limit);
    }

    async _getPromoFeed({ afterId, limit, tags }) {
        const payoutDate = new Date(Date.now() - env.GLS_PAYOUT_RANGE);
        const query = { createdInBlockchain: { $gt: payoutDate } };

        this._injectQueryParams(query, { afterId, tags });

        return await this._queryFeedWithAnnotate(query, { 'promote.balance': -1 }, limit);
    }

    async _getPersonalFeed({ afterId, limit, user, tags }) {
        const query = {};

        this._injectQueryParams(query, { afterId, tags });

        const userModel = await User.findOne({ name: user }, { following: true });

        if (!userModel || !userModel.following || !userModel.following.length) {
            return this._annotate([]);
        }

        query.author = { $in: userModel.following };

        return await this._queryFeedWithAnnotate(query, { _id: -1 }, limit);
    }

    _injectQueryParams(query, { afterId, tags }) {
        if (afterId) {
            query._id = { $lt: afterId };
        }

        if (tags.length) {
            query['metadata.tags'] = { $in: tags };
        }
    }

    async _queryFeedWithAnnotate(query, sort, limit) {
        return this._annotate(await this._queryFeed(query, sort, limit));
    }

    async _queryFeed(query, sort, limit) {
        return await Post.find(query, { __v: false }, { limit, lean: true, sort });
    }

    _annotate(responseDate = []) {
        return {
            total: responseDate.length,
            data: responseDate,
        };
    }
}

module.exports = Feed;
