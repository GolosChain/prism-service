const elasticsearch = require('elasticsearch');
const bodybuilder = require('bodybuilder');
const pluralize = require('pluralize');
const core = require('cyberway-core-service');
const Logger = core.utils.Logger;
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class Search extends BasicController {
    constructor(...args) {
        super(...args);

        this._esclient = new elasticsearch.Client({
            host: env.GLS_SEARCH_CONNECTION_STRING,
        });
    }

    async search({ where, text, field, limit, offset, type }) {
        type = this._parseType(type);
        field = this._parseField(field);

        if (where === 'all') {
            where = '_all';
        }

        if (field === 'all') {
            type = 'query_string';
            field = 'query';
            text += '*';
        }

        const body = bodybuilder()
            .query(type, field, text)
            .size(limit)
            .from(offset)
            .build();

        try {
            const result = await this._esclient.search({
                index: where,
                body,
            });

            if (result.hits.total > 0) {
                return this._prepareResponse(result.hits.hits);
            } else {
                return { results: [] };
            }
        } catch (error) {
            Logger.error(error);
            throw error;
        }
    }

    _parseType(type) {
        const typeMapping = {
            match: 'match',
            matchPrefix: 'match_phrase_prefix',
        };

        return typeMapping[type];
    }

    _parseField(field) {
        const fieldMapping = {
            full: 'body.full',
            raw: 'body.raw',
            preview: 'body,preview',
        };

        return fieldMapping[field] || field;
    }

    _mergeResults(...arrays) {
        const uniqueResults = new Map();

        for (const array of arrays) {
            for (const doc of array) {
                uniqueResults.set(doc._id, doc);
            }
        }
        return [...uniqueResults.values()];
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
        return { results: this._differByTypes(this._mergeResults(...results)) };
    }
}

module.exports = Search;
