const core = require('gls-core-service');
const Logger = core.utils.Logger;
const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const ProfileModel = require('../../models/Profile');
const WilsonScoring = require('../../utils/WilsonScoring');
const PoolModel = require('../../models/Pool');

class Vote extends AbstractContent {
    async handleUpVote(content, { communityId, events }) {
        const model = await this._getModel(content);

        if (!model) {
            return;
        }

        const votesManager = this._makeVotesManager(model, content);

        await votesManager('up', 'add');
        await votesManager('down', 'remove');
        await this._updatePayout(model, communityId, events);
    }

    async handleDownVote(content, { communityId, events }) {
        const model = await this._getModel(content);

        if (!model) {
            return;
        }

        const votesManager = this._makeVotesManager(model, content);

        await votesManager('up', 'remove');
        await votesManager('down', 'add');
        await this._updatePayout(model, communityId, events);
    }

    async handleUnVote(content, { communityId, events }) {
        const model = await this._getModel(content);

        if (!model) {
            return;
        }

        const votesManager = this._makeVotesManager(model, content);

        await votesManager('up', 'remove');
        await votesManager('down', 'remove');
        await this._updatePayout(model, communityId, events);
    }

    async handleReputation({ voter, author, rshares: rShares }) {
        await this._updateProfileReputation(voter, author, rShares);
    }

    async _updateProfileReputation(voter, author, rShares) {
        const modelVoter = await ProfileModel.findOne(
            { userId: voter },
            {
                'stats.reputation': true,
            },
            { lean: true }
        );

        if (!modelVoter) {
            Logger.warn(`Unknown voter - ${voter}`);
            return;
        }

        if (modelVoter.stats.reputation < 0) {
            return;
        }

        const modelAuthor = await ProfileModel.findOne(
            { userId: author },
            {
                'stats.reputation': true,
            }
        );

        if (!modelAuthor) {
            Logger.warn(`Unknown voter - ${author}`);
            return;
        }

        if (rShares < 0 && modelVoter.stats.reputation <= modelAuthor.stats.reputation) {
            return;
        }

        modelAuthor.stats.reputation += Number(rShares);
        // TODO Fork log
        await modelAuthor.save();
    }

    _makeVotesManager(model, content) {
        const vote = this._extractVote(content);

        return async (type, action) => {
            await this._manageVotes({ model, vote, type, action });
        };
    }

    async _manageVotes({ model, vote, type, action }) {
        let addAction = '$addToSet';
        let removeAction = '$pull';
        let increment = 1;

        if (action === 'remove') {
            addAction = '$pull';
            removeAction = '$addToSet';
            increment = -1;
        }

        const Model = model.constructor;
        const pack = model.votes[`${type}Votes`] || [];

        if (pack.find(item => item.userId === vote.userId)) {
            return;
        }

        const votesArrayPath = `votes.${type}Votes`;
        const votesCountPath = `votes.${type}Count`;
        const previousModel = await Model.findOneAndUpdate(
            { _id: model._id },
            {
                [addAction]: { [votesArrayPath]: vote },
                $inc: { [votesCountPath]: increment },
            }
        );

        await this.registerForkChanges({
            type: 'update',
            Model,
            documentId: previousModel._id,
            data: {
                [removeAction]: { [votesArrayPath]: vote },
                $inc: { [votesCountPath]: -increment },
            },
        });
    }

    _extractVote(content) {
        return { userId: content.voter, weight: content.weight };
    }

    async _getModel(content) {
        const contentId = this._extractContentId(content);
        const query = { contentId };
        const projection = { votes: true, payout: true, meta: true, stats: true };
        const post = await PostModel.findOne(query, projection);

        if (post) {
            return post;
        }

        const comment = await CommentModel.findOne(query, projection);

        if (comment) {
            return comment;
        }

        return null;
    }

    async _updatePayout(model, communityId, events) {
        const { postState, poolState } = this._getPayoutEventsData(events);

        await this._actualizePoolState(poolState, communityId);

        const previousScoringQuery = this._addPayoutScoring(model, postState);
        const previousMetaQuery = this._addPayoutMeta(model, postState);

        await model.save();

        await this.registerForkChanges({
            type: 'update',
            Model: model.constructor,
            documentId: model._id,
            data: {
                $set: {
                    ...previousScoringQuery,
                    ...previousMetaQuery,
                },
            },
        });
    }

    _getPayoutEventsData(events) {
        let postState;
        let poolState;
        let voteState;

        for (const event of events) {
            switch (true) {
                case event.event === 'poststate':
                    postState = event.args;
                    continue;

                case event.event === 'poolstate':
                    poolState = event.args;
                    continue;

                case event.event === 'votestate':
                    voteState = event.args;
            }
        }

        return { postState, poolState, voteState };
    }

    async _actualizePoolState(poolState, communityId) {
        const fundsValueRaw = poolState.funds;
        const [value, name] = fundsValueRaw.split(' ');
        const previousModel = await PoolModel.findOneAndUpdate(
            { communityId },
            {
                $set: {
                    funds: {
                        name: name,
                        value: Number(value),
                    },
                    rShares: Number(poolState.rshares),
                    rSharesFn: Number(poolState.rsharesfn),
                },
            },
            { upsert: true }
        );

        await this.registerForkChanges({
            type: 'update',
            Model: PoolModel,
            documentId: previousModel._id,
            data: {
                $set: {
                    funds: {
                        name: previousModel.name,
                        value: previousModel.value,
                    },
                    rShares: previousModel.rShares,
                    rSharesFn: previousModel.rSharesFn,
                },
            },
        });
    }

    _addPayoutScoring(model, postState) {
        const rShares = Number(postState.netshares);

        model.stats = model.stats || {};

        const previousQuery = {
            ['stats.rShares']: model.stats.rShares,
            ['stats.hot']: model.stats.hot,
            ['stats.trending']: model.stats.trending,
        };

        model.stats.rShares = rShares;
        model.stats.hot = WilsonScoring.calcHot(rShares, model.meta.time);
        model.stats.trending = WilsonScoring.calcTrending(rShares, model.meta.time);

        return previousQuery;
    }

    _addPayoutMeta(model, postState) {
        const meta = model.payout.meta;
        const previousQuery = {
            ['payout.meta.sharesFn']: meta.sharesFn,
            ['payout.meta.sumCuratorSw']: meta.sumCuratorSw,
        };

        meta.sharesFn = Number(postState.sharesfn);
        meta.sumCuratorSw = Number(postState.sumcuratorsw);

        return previousQuery;
    }
}

module.exports = Vote;
