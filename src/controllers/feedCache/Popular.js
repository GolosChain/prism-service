const moment = require('moment');
const env = require('../../data/env');
const PostModel = require('../../models/Post');

class Popular {
    async getFor(communityId, timeframe) {
        const query = { communityId };
        const projection = { _id: true };
        const options = { limit: env.GLS_FEED_CACHE_MAX_ITEMS, lean: true };

        this._applyTimeCond(query, options, timeframe);

        if (communityId === '~all') {
            delete query.communityId;
        }

        const result = await PostModel.find(query, projection, options);

        if (result) {
            return result.map(model => model._id);
        } else {
            return [];
        }
    }

    _applyTimeCond(query, options, timeframe) {
        switch (timeframe) {
            case 'day':
                this._applyQueryDaysAgo(query, 1);
                this._applySortByRShares(options);
                break;
            case 'week':
                this._applyQueryDaysAgo(query, 7);
                this._applySortByRShares(options);
                break;
            case 'month':
                this._applyQueryDaysAgo(query, 30);
                this._applySortByRShares(options);
                break;
            case 'year':
                this._applyQueryDaysAgo(query, 365);
                this._applySortByRShares(options);
                break;
            case 'all':
                this._applySortByRShares(options);
                break;
            case 'WilsonHot':
                this._applySortByWilson(options, 'hot');
                break;
            case 'WilsonTrending':
                this._applySortByWilson(options, 'trending');
                break;
            default:
                throw `Unknown timeframe - ${timeframe}`;
        }
    }

    _daysAgo(amount) {
        return moment()
            .subtract(amount, 'days')
            .toDate();
    }

    _applyQueryDaysAgo(query, days) {
        Object.assign(query, { 'meta.time': { $gte: this._daysAgo(days) } });
    }

    _applySortByRShares(options) {
        Object.assign(options, { sort: { 'payout.rShares': -1 } });
    }

    _applySortByWilson(options, type) {
        Object.assign(options, { sort: { [`stats.wilson.${type}`]: -1 } });
    }
}

module.exports = Popular;
