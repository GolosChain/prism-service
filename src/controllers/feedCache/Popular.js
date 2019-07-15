const { MongoClient } = require('mongodb');
const moment = require('moment');
const PostModel = require('../../models/Post');
const Abstract = require('./Abstract');

let connection = null;

class Popular extends Abstract {
    constructor(...args) {
        super(...args);

        connection = MongoClient.connect(
            'mongodb://prism-mongo',
            {
                useNewUrlParser: true,
            }
        ).catch(err => {
            console.error('MONGO ERROR', err);
            process.exit(1);
        });
    }

    async getFor(communityId, timeframe) {
        const { query, projection, options } = this._getDefaultRequestOptions(communityId);

        query['repost.isRepost'] = false;

        this._applyTimeCond(query, options, timeframe);

        console.log('PostModel.find:', query, projection, options);

        const db = (await connection).db('admin');

        const modelObjects = await db
            .collection('posts')
            .find(query, projection)
            .sort(options.sort)
            .limit(options.limit)
            .toArray();

        return this._makeResult(modelObjects);

        // PostModel.find(query, projection, options)
        //     .stream()
        //     .on('data', document => {
        //         modelObjects.push(document);
        //     })
        //     .on('end', () => {
        //         resolve(this._makeResult(modelObjects));
        //     })
        //     .on('error', error => {
        //         reject(error);
        //     });
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
