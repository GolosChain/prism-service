const moment = require('moment');
const PostModel = require('../../models/Post');
const Abstract = require('./Abstract');

class Popular extends Abstract {
    getFor(communityId, timeframe) {
        return new Promise((resolve, reject) => {
            const modelObjects = [];

            const { query, projection, options } = this._getDefaultRequestOptions(communityId);

            query['repost.isRepost'] = false;

            this._applyTimeCond(query, options, timeframe);

            PostModel.find(query, projection, options)
                .stream()
                .on('data', document => {
                    modelObjects.push(document);
                })
                .on('end', () => {
                    resolve(this._makeResult(modelObjects));
                })
                .on('error', error => {
                    reject(error);
                });
        });
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
        options.sort[`stats.${type}`] = -1;
    }
}

module.exports = Popular;
