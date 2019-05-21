const AbstractFeed = require('./AbstractFeed');
const LeaderModel = require('../../models/Leader');
const ProfileModel = require('../../models/Profile');

class Leaders extends AbstractFeed {
    constructor({ leaderFeedCache }) {
        super();

        this._leaderFeedCache = leaderFeedCache;
    }

    async getTop({ currentUserId, communityId, limit, sequenceKey, app }) {
        const queryData = { communityId, sequenceKey, limit };
        const { query, projection, options, meta } = this._prepareQuery(queryData);

        const modelObjects = await LeaderModel.find(query, projection, options);

        if (!modelObjects) {
            return this._makeEmptyFeedResult();
        }

        await this._populateUsers(modelObjects, app);
        await this._tryApplyVotesForModels(modelObjects, currentUserId);
        this._finalizeCachedSorting(modelObjects, query);

        return this._makeFeedResult(modelObjects, { limit }, meta);
    }

    async _tryApplyVotesForModels(modelObjects, currentUserId) {
        for (const modelObject of modelObjects) {
            if (!currentUserId) {
                modelObject.hasVote = false;
                return;
            }

            const voteCount = await LeaderModel.count({
                _id: modelObject._id,
                votes: currentUserId,
            });

            modelObject.hasVote = Boolean(voteCount);
        }
    }

    _getSequenceKey(modelObjects, { limit }, meta) {
        return this._getCachedSequenceKey(modelObjects, limit, meta);
    }

    _prepareQuery({ communityId, sequenceKey, limit }) {
        const query = {};
        const projection = {
            __v: false,
            createdAt: false,
            updatedAt: false,
            votes: false,
        };
        const options = { lean: true };

        if (sequenceKey) {
            sequenceKey = this._unpackSequenceKey(sequenceKey);
        }

        const { ids, newSequenceKey } = this._leaderFeedCache.getIdsWithSequenceKey({
            communityId,
            sequenceKey,
            limit,
        });

        query._id = { $in: ids };

        return { query, projection, options, meta: { newSequenceKey } };
    }

    async _populateUsers(modelObjects, app) {
        const results = [];

        for (const modelObject of modelObjects) {
            results.push(this._populateUser(modelObject, app));
        }

        await Promise.all(results);
    }
}

module.exports = Leaders;
