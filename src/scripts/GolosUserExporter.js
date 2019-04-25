const mongoNative = require('mongodb');
const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;
const ProfileModel = require('../models/Profile');

class GolosUserExporter {
    async exportUsers(prismMongooseMongo, blockChainMongoConnectString) {
        const blockChainMongo = await mongoNative.MongoClient.connect(blockChainMongoConnectString);
        const db = blockChainMongo.db('_CYBERWAY_');

        await db
            .collection('username')
            .find({})
            .project({ owner: 1, name: 1, _id: 0 })
            .forEach(this._createUser.bind(this));
    }

    _createUser(document) {
        if (!document) {
            return;
        }

        ProfileModel.updateOne(
            { userId: document.owner },
            { userId: document.owner, username: `${document.name}@golos` },
            { upsert: true }
        ).catch(error => {
            Logger.error(`GOLOS Export users error - ${error}`);
            process.exit(1);
        });
    }
}

module.exports = GolosUserExporter;
