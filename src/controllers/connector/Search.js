const elasticsearch = require('elasticsearch');
const bodybuilder = require('bodybuilder');
const pluralize = require('pluralize');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const BasicController = core.controllers.Basic;
const env = require('../../data/env');
const esclient = new elasticsearch.Client({
    host: env.GLS_SEARCH_CONNECTION_STRING,
});

class Search extends BasicController {
    async search({ where, text, field, count, offset, type }) {
        if (field === '_all') {
            type = 'query_string';
            field = 'query';
            text += '*';
        }

        const body = bodybuilder()
            .query(type, field, text)
            .size(count)
            .from(offset)
            .build();

        try {
            const result = await esclient.search({
                index: where,
                body,
            });

            if (result.hits.total > 0) {
                return this._prepareResponse(result.hits.hits);
            } else {
                return [];
            }
        } catch (error) {
            Logger.error(error);
            throw error;
        }
    }

    _mergeResults(...arrays) {
        if (arrays.length > 1) {
            const uniqueResults = new Map();
            for (const array of arrays) {
                for (const doc of array) {
                    uniqueResults.set(doc._id, doc);
                }
            }
            return [...uniqueResults.values()];
        } else {
            return arrays[0];
        }
    }

    _differByTypes(results) {
        const differedResults = {};
        for (const doc of results) {
            let type = doc._type;
            if (pluralize.isSingular(type)) {
                type = pluralize.plural(type).toLowerCase();
            }
            if (!differedResults[type]) {
                differedResults[type] = [];
            }
            differedResults[type].push(doc);
        }
        return differedResults;
    }

    _prepareResponse(...results) {
        return this._differByTypes(this._mergeResults(...results));
    }
}

module.exports = Search;
