const moment = require('moment');
const PostModel = require('../../models/Post');
const Abstract = require('./Abstract');

class Popular extends Abstract {
    async getFor(communityId, timeframe) {
        const { query, projection, options } = this._getDefaultRequestOptions(communityId);

        query['repost.isRepost'] = { $ne: true };

        this._applyTimeCond(query, options, timeframe);

        const modelObjects = await PostModel.find(query, projection, options);

        return this._makeResult(modelObjects);
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
        query['meta.time'] = query['meta.time'] || {};
        query['meta.time'].$gte = this._daysAgo(days);
    }

    _applySortByRShares(options) {
        options.sort = options.sort || {};
        options.sort['stats.rShares'] = -1;
    }

    _applySortByWilson(options, type) {
        options.sort = options.sort || {};
        options.sort[`stats.wilson.${type}`] = -1;
    }
}

module.exports = Popular;
