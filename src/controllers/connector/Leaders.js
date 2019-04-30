const AbstractFeed = require('./AbstractFeed');
const LeaderModel = require('../../models/Leader');
const ProfileModel = require('../../models/Profile');

class Leaders extends AbstractFeed {
    constructor({ leaderFeedCache }) {
        super();

        this._leaderFeedCache = leaderFeedCache;
    }

    async getTop({ currentUserId, communityId, limit, sequenceKey }) {
        const queryData = { communityId, sequenceKey, limit };
        const { query, projection, options, meta } = this._prepareQuery(queryData);

        const modelObjects = await LeaderModel.find(query, projection, options);

        if (!modelObjects) {
            return this._makeEmptyFeedResult();
        }

        await this._populateUsers(modelObjects, communityId);
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

    async _populateUsers(modelObjects, communityId) {
        for (const modelObject of modelObjects) {
            await this._populateUser(modelObject, communityId);
        }
    }

    async _populateUser(modelObject, communityId) {
        const profile = await ProfileModel.findOne(
            { userId: modelObject.userId },
            { _id: false, usernames: true }
        );

        let app;

        switch (communityId) {
            case 'gls':
                app = 'gls';
                break;

            case 'cyber':
            default:
                app = 'cyber';
                break;
        }

        if (profile && profile.usernames) {
            modelObject.username = profile.usernames[app];
        } else {
            modelObject.username = modelObject.userId;
        }
    }
}

module.exports = Leaders;
