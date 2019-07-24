const AbstractFeed = require('./AbstractFeed');
const LeaderModel = require('../../models/Leader');
const ProposalModel = require('../../models/Proposal');

class Leaders extends AbstractFeed {
    constructor({ leaderFeedCache }) {
        super();

        this._leaderFeedCache = leaderFeedCache;
    }

    async getTop({ currentUserId, communityId, limit, sequenceKey, app }) {
        const queryData = { communityId, sequenceKey, limit };
        const { query, projection, options, meta } = this._prepareQuery(queryData);

        const modelObjects = await LeaderModel.find(query, projection, options);

        if (!modelObjects || modelObjects.length === 0) {
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

            const voteCount = await LeaderModel.countDocuments({
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
            _id: true,
            communityId: true,
            userId: true,
            url: true,
            rating: true,
            active: true,
        };
        const options = { lean: true, sort: { rating: -1 } };

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

    async getProposals({ communityId, limit, sequenceKey, app }) {
        const query = {
            communityId,
        };

        if (sequenceKey) {
            const lastId = this._unpackSequenceKey(sequenceKey);

            query._id = {
                $gt: lastId,
            };
        }

        const items = await ProposalModel.find(
            query,
            {
                userId: true,
                proposalId: true,
                code: true,
                action: true,
                expiration: true,
                'changes.structureName': true,
                'changes.values': true,
            },
            { lean: true, limit }
        );

        const users = [];

        for (const item of items) {
            const user = {
                userId: item.userId,
            };

            users.push(user);

            item.author = user;
        }

        await this._populateUsers(users, app);

        let resultSequenceKey = null;

        if (items.length === limit) {
            resultSequenceKey = this._packSequenceKey(items[items.length - 1]._id);
        }

        for (const item of items) {
            delete item._id;
            delete item.userId;
        }

        return {
            items,
            sequenceKey: resultSequenceKey,
        };
    }
}

module.exports = Leaders;
