const elasticsearch = require('elasticsearch');
const bodybuilder = require('bodybuilder');
const core = require('gls-core-service');
const BasicService = core.services.Basic;
const env = require('../data/env');
const SyncModel = require('../models/SearchSync');
const esclient = new elasticsearch.Client({
    host: env.GLS_SEARCH_CONNECTION_STRING,
});

class SyncService extends BasicService {
    constructor(modelsToWatch, modelsMappers, ...args) {
        super(...args);
        this.modelsToWatch = modelsToWatch;
        this.modelsMappers = modelsMappers;
        this.modelsInSync = new Map();
    }

    async start() {
        await this._waitForElasticSearch();

        for (const model of this.modelsToWatch) {
            const exists = await esclient.indices.exists({ index: model.modelName.toLowerCase() });

            if (!exists) {
                await esclient.indices.create({
                    index: model.modelName.toLowerCase(),
                });
            }
        }
        await this.startLoop(0, env.GLS_SEARCH_SYNC_TIMEOUT);
        await this.startDeleteLoop(env.GLS_SEARCH_SYNC_TIMEOUT, 10000);
    }

    async stop() {
        this.stopLoop();
        this.stopDeleteLoop();
    }

    startDeleteLoop(firstIterationTimeout = 0, interval) {
        setTimeout(async () => {
            if (interval) {
                await this.deleteIteration();
                this._deleteLoopId = setInterval(this.deleteIteration.bind(this), interval);
            } else {
                await this.deleteIteration();
            }
        }, firstIterationTimeout);
    }

    stopDeleteLoop() {
        if (this._deleteLoopId) {
            clearInterval(this._deleteLoopId);
        }
    }

    async deleteIteration() {
        for (const model of this.modelsToWatch) {
            await this._syncDeleted(model);
        }
    }

    async _waitForElasticSearch(retryNum = 1, maxRetries = 10) {
        try {
            return await esclient.ping();
        } catch (error) {
            if (retryNum < maxRetries) {
                return await this._waitForElasticSearch(retryNum + 1);
            } else {
                throw 'Too many retries to ping Elasticsearch';
            }
        }
    }

    async _checkIndexExists({ id, index, type }) {
        return await esclient.exists({
            id,
            index,
            type,
        });
    }

    async _getDocSyncType({ index, id, type }) {
        let syncType = 'create';
        const indexExists = await this._checkIndexExists({ id, index, type });

        if (indexExists) {
            syncType = 'update';
        }
        return syncType;
    }

    async _createIndex({ index, body, type, id }) {
        return await esclient.create({
            index,
            body,
            type,
            id,
        });
    }

    async _updateIndex({ index, body, type, id }) {
        return await esclient.update({
            index,
            body: { doc: body },
            type,
            id,
        });
    }

    async _deleteIndex({ index, type, id }) {
        return await esclient.delete({ type, index, id });
    }

    _mapBody(data, modelType) {
        try {
            return this.modelsMappers[modelType]({ ...data });
        } catch (error) {
            return data;
        }
    }

    _prepareIndexBody({ data, model }) {
        const modelName = model.modelName;
        const dataModel = this._mapBody(new model(data).toObject(), modelName);
        const id = data._id.toString();
        const index = modelName.toLowerCase();

        delete dataModel._id;

        return {
            body: dataModel,
            id,
            index,
            type: modelName,
        };
    }

    async _syncDoc(model, data) {
        const indexDoc = this._prepareIndexBody({ data, model });
        const syncType = await this._getDocSyncType(indexDoc);

        switch (syncType) {
            case 'create':
                await this._createIndex(indexDoc);
                break;
            case 'update':
                await this._updateIndex(indexDoc);
                break;
        }
    }

    async _getDocsToSync(model, from = new Date(null)) {
        return await await model.find({
            updatedAt: { $gte: from },
        });
    }

    async _getAllIndexes(model, offset = 0) {
        const STEP = 1000;
        const allDocs = [];
        const body = bodybuilder()
            .query('match_all')
            .size(STEP)
            .from(offset)
            .build();

        const allDocsResponse = await esclient.search({
            index: model.modelName.toLowerCase(),
            body,
        });
        allDocs.push(...allDocsResponse.hits.hits);

        if (allDocsResponse.hits.hits.length === STEP) {
            allDocs.push(...(await this._getAllIndexes(model, offset + STEP)));
        }
        return allDocs;
    }

    async _syncModel(model, from) {
        const dataToSync = await this._getDocsToSync(model, from);

        if (dataToSync.length > 0) {
            for (const data of dataToSync) {
                await this._syncDoc(model, data);
            }
        }
    }

    async _syncDeleted(model) {
        const allDocs = await this._getAllIndexes(model);

        for (const doc of allDocs) {
            const count = await model.countDocuments({ _id: doc._id });

            if (count !== 0) {
                return;
            }

            const docToDelete = this._prepareIndexBody({ data: doc, model });
            try {
                await this._deleteIndex(docToDelete);
            } catch (error) {
                // do nothing
            }
        }
    }

    async _findOrCreateSyncModel(model) {
        let modelSync = await SyncModel.findOne({ model: model.modelName });

        if (!modelSync) {
            modelSync = new SyncModel({
                model: model.modelName,
            });

            await modelSync.save();
        }
        return modelSync;
    }

    async iteration() {
        for (const model of this.modelsToWatch) {
            const syncModel = await this._findOrCreateSyncModel(model);

            if (this.modelsInSync.get(syncModel)) {
                continue;
            }

            this.modelsInSync.set(syncModel, true);

            await this._syncModel(model, syncModel.lastSynced);

            syncModel.lastSynced = Date.now();
            await syncModel.save();
            this.modelsInSync.set(syncModel, false);
        }
    }
}

module.exports = SyncService;
