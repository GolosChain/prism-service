const elasticsearch = require('elasticsearch');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const BasicService = core.services.Basic;
const env = require('../data/env');
const SyncModel = require('../models/SearchSync');
const esclient = new elasticsearch.Client({
    host: env.GLS_SEARCH_CONNECTION_STRING,
});

class SyncService extends BasicService {
    constructor(modelsToWatch, ...args) {
        super(...args);
        this.modelsToWatch = modelsToWatch;
    }

    async start() {
        await this.startLoop(0, env.GLS_SEARCH_SYNC_TIMEOUT);
    }

    async stop() {
        await this.stopLoop();
    }

    async checkIndexExists({ id, index, type }) {
        try {
            await esclient.get({
                id,
                index,
                type,
            });

            return true;
        } catch (error) {
            if (error.status === 404) {
                return false;
            } else {
                throw error;
            }
        }
    }

    async getDocSyncType({ index, id, type }) {
        let syncType = 'create';
        const indexExists = await this.checkIndexExists({ id, index, type });

        if (indexExists) {
            syncType = 'update';
        }
        return syncType;
    }

    async createIndex({ index, body, type, id }) {
        return await esclient.create({
            index,
            body,
            type,
            id,
        });
    }

    async updateIndex({ index, body, type, id }) {
        return await esclient.update({
            index,
            body: { doc: body },
            type,
            id,
        });
    }

    prepareIndexBody({ data, model }) {
        const dataModel = new model(data).toObject();
        const id = dataModel._id.toString();
        const index = model.modelName.toLowerCase();
        const type = 'doc';

        delete dataModel._id;

        return {
            body: dataModel,
            id,
            index,
            type,
        };
    }

    async syncDoc(model, data) {
        const indexDoc = this.prepareIndexBody({ data, model });
        const syncType = await this.getDocSyncType(indexDoc);

        switch (syncType) {
            case 'create':
                await this.createIndex(indexDoc);
                break;
            case 'update':
                await this.updateIndex(indexDoc);
                break;
        }
    }

    async getDocsToSync(model, from = new Date(null)) {
        return await await model.find({
            $or: [{ updatedAt: { $gte: from } }, { createdAt: { $gte: from } }],
        });
    }

    async syncModel(model, from) {
        const dataToSync = await this.getDocsToSync(model, from);

        if (dataToSync.length > 0) {
            for (const data of dataToSync) {
                await this.syncDoc(model, data);
            }
            Logger.info(`${model.modelName} has synced ${dataToSync.length} docs`);
        }
    }

    async findOrCreateSyncModel(model) {
        let modelSync = await SyncModel.findOne({ model: model.modelName });

        if (!modelSync) {
            modelSync = new SyncModel({
                model: model.modelName,
                inSync: false,
            });

            await modelSync.save();
        }
        return modelSync;
    }

    async iteration() {
        for (const model of this.modelsToWatch) {
            const syncModel = await this.findOrCreateSyncModel(model);

            if (!syncModel.inSync) {
                syncModel.inSync = true;
                await syncModel.save();

                await this.syncModel(model, syncModel.lastSynced);

                syncModel.inSync = false;
                syncModel.lastSynced = Date.now();
                await syncModel.save();
            }
        }
    }
}

module.exports = SyncService;
