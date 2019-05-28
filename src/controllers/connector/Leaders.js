const { last, omit } = require('ramda');

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

    async getProposals({ communityId, limit, sequenceKey, app }) {
        const query = {
            communityId,
        };

        if (sequenceKey) {
            query._id = {
                $gt: sequenceKey,
            };
        }

        const items = await ProposalModel.find(
            query,
            {
                userId: 1,
                proposalId: 1,
                code: 1,
                action: 1,
                expiration: 1,
                'changes.structureName': 1,
                'changes.values': 1,
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

        return {
            items: items.map(item => omit(['_id', 'userId'], item)),
            sequenceKey: items.length < limit ? null : last(items)._id,
        };
    }
}

module.exports = Leaders;
