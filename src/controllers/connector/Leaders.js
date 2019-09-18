const escape = require('escape-string-regexp');

const AbstractFeed = require('./AbstractFeed');
const LeaderModel = require('../../models/Leader');
const ProposalModel = require('../../models/Proposal');
const ProfileModel = require('../../models/Profile');

class Leaders extends AbstractFeed {
    constructor({ leaderFeedCache }) {
        super();

        this._leaderFeedCache = leaderFeedCache;
    }

    async getTop({ query, ...params }) {
        if (query) {
            return await this._findLeaders({ query, ...params });
        } else {
            return await this._getTop(params);
        }
    }

    async _findLeaders({ query, currentUserId, communityId, limit, app = 'gls', sequenceKey }) {
        const filter = {
            [`usernames.${app}`]: { $regex: `^${escape(query.trim().toLowerCase())}` },
            leaderIn: communityId,
        };

        if (sequenceKey) {
            filter._id = { $gt: sequenceKey };
        }

        const pipeline = [
            {
                $match: filter,
            },
            {
                $project: {
                    _id: true,
                    userId: true,
                    usernames: true,
                },
            },
            {
                $lookup: {
                    from: 'leaders',
                    localField: 'userId',
                    foreignField: 'userId',
                    as: 'leader',
                },
            },
            {
                $limit: limit,
            },
        ];

        const profiles = await ProfileModel.aggregate(pipeline);

        const leaders = [];

        for (const profile of profiles) {
            if (profile.leader.length > 0) {
                const leader = profile.leader[0];

                leaders.push({
                    _id: leader._id,
                    userId: leader.userId,
                    username: profile.usernames[app] || null,
                    communityId: leader.communityId,
                    active: leader.active,
                    url: leader.url,
                    rating: leader.rating,
                    stats: leader.stats,
                    position: leader.position,
                });
            }
        }

        leaders.sort((a, b) => {
            const diff = Number(b.rating) - Number(a.rating);

            if (diff === 0) {
                return a.userId.localeCompare(b.userId);
            }

            return diff;
        });

        await this._populateUsers(leaders, app);
        await this._tryApplyVotesForModels(leaders, currentUserId);

        for (const leader of leaders) {
            delete leader._id;
        }

        return {
            items: leaders,
            sequenceKey: null,
        };
    }

    async _getTop({ currentUserId, communityId, limit, sequenceKey, app }) {
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
            if (currentUserId) {
                const voteCount = await LeaderModel.countDocuments({
                    _id: modelObject._id,
                    votes: currentUserId,
                });

                modelObject.hasVote = Boolean(voteCount);
            } else {
                modelObject.hasVote = false;
            }
        }
    }

    _getSequenceKey(modelObjects, { limit }, meta) {
        return this._getCachedSequenceKey(modelObjects, limit, meta);
    }

    _prepareQuery({ communityId, sequenceKey, limit }) {
        const query = {
            communityId,
        };
        const projection = {
            _id: true,
            communityId: true,
            userId: true,
            url: true,
            rating: true,
            active: true,
            position: true,
        };
        const options = { lean: true, sort: { position: 1 } };

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
        await Promise.all(modelObjects.map(modelObject => this._populateUser(modelObject, app)));
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
                blockTime: true,
                expiration: true,
                approves: true,
                isExecuted: true,
                executedBlockTime: true,
                data: true,
                'changes.structureName': true,
                'changes.values': true,
            },
            {
                lean: true,
                limit,
                sort: {
                    isExecuted: -1,
                    blockTime: -1,
                },
            }
        );

        const users = {};

        for (const item of items) {
            users[item.userId] = true;

            for (const { userId } of item.approves) {
                users[userId] = true;
            }
        }

        let resultSequenceKey = null;

        if (items.length === limit) {
            resultSequenceKey = this._packSequenceKey(items[items.length - 1]._id);
        }

        for (const userId of Object.keys(users)) {
            users[userId] = { userId };
        }

        await this._populateUsers(Array.from(Object.values(users)), app);

        for (const item of items) {
            item.author = {
                userId: item.userId,
                ...users[item.userId],
            };

            item.approves = item.approves.map(approve => ({
                userId: approve.userId,
                username: users[approve.userId].username,
                avatarUrl: users[approve.userId].avatarUrl,
                permission: approve.permission,
                isSigned: approve.isSigned,
            }));

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
