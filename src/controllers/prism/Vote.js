const core = require('gls-core-service');
const Logger = core.utils.Logger;
const BigNum = core.types.BigNum;
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

        await this._includeUpVote(model, { userId: content.voter, weight: content.weight });
        await this._excludeDownVote(model, content.voter);
        await this._updatePayout(model, communityId, events);

        await model.save();
    }

    async handleDownVote(content, { communityId, events }) {
        const model = await this._getModel(content);

        if (!model) {
            return;
        }

        await this._includeDownVote(model, { userId: content.voter, weight: content.weight });
        await this._excludeUpVote(model, content.voter);
        await this._updatePayout(model, communityId, events);

        await model.save();
    }

    async handleUnVote(content, { communityId, events }) {
        const model = await this._getModel(content);

        if (!model) {
            return;
        }

        await this._excludeUpVote(model, content.voter);
        await this._excludeDownVote(model, content.voter);
        await this._updatePayout(model, communityId, events);

        await model.save();
    }

    async _includeUpVote(model, vote) {
        const pack = model.votes.upVotes || [];

        if (!pack.find(item => item.userId === vote.userId)) {
            await model.constructor.updateOne(
                { _id: model._id },
                {
                    $addToSet: { 'votes.upVotes': vote },
                    $inc: { 'votes.upCount': 1 },
                }
            );
        }
    }

    async _includeDownVote(model, vote) {
        const pack = model.votes.downVotes || [];

        if (!pack.find(item => item.userId === vote.userId)) {
            await model.constructor.updateOne(
                { _id: model._id },
                {
                    $addToSet: { 'votes.downVotes': vote },
                    $inc: { 'votes.downCount': 1 },
                }
            );
        }
    }

    async _excludeUpVote(model, userId) {
        const pack = model.votes.upVotes || [];

        const vote = pack.find(item => item.userId === userId);

        if (vote) {
            await model.constructor.updateOne(
                { _id: model._id },
                {
                    $pull: { 'votes.upVotes': vote },
                    $inc: { 'votes.upCount': -1 },
                }
            );
        }
    }

    async _excludeDownVote(model, userId) {
        const pack = model.votes.downVotes || [];

        const vote = pack.find(item => item.userId === userId);

        if (vote) {
            await model.constructor.updateOne(
                { _id: model._id },
                {
                    $pull: { 'votes.downVotes': vote },
                    $inc: { 'votes.downCount': -1 },
                }
            );
        }
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
        await modelAuthor.save();
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
        this._addPayoutScoring(model, postState);
        this._addPayoutMeta(model, postState);
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

        await PoolModel.updateOne(
            { communityId },
            {
                $set: {
                    funds: {
                        name: name,
                        value: new BigNum(value),
                    },
                    rShares: new BigNum(poolState.rshares),
                    rSharesFn: new BigNum(poolState.rsharesfn),
                },
            },
            { upsert: true }
        );
    }

    _addPayoutScoring(model, postState) {
        const rShares = Number(postState.netshares);

        model.stats = model.stats || {};
        model.stats.rShares = rShares;
        model.stats.hot = WilsonScoring.calcHot(rShares, model.meta.time);
        model.stats.trending = WilsonScoring.calcTrending(rShares, model.meta.time);
    }

    _addPayoutMeta(model, postState) {
        const meta = model.payout.meta;

        meta.sharesFn = new BigNum(postState.sharesfn);
        meta.sumCuratorSw = new BigNum(postState.sumcuratorsw);
    }
}

module.exports = Vote;
