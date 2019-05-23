const core = require('gls-core-service');
const Logger = core.utils.Logger;
const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const ProfileModel = require('../../models/Profile');
const WilsonScoring = require('../../utils/WilsonScoring');

class Vote extends AbstractContent {
    async handleUpVote(content, { events }) {
        const model = await this._getModel(content, { votes: true, payout: true });

        if (!model) {
            return;
        }

        this._includeUpVote(model, { userId: content.voter, weight: content.weight });
        this._excludeDownVote(model, content.voter);
        await this._updatePayout(model, events);

        await model.save();
    }

    async handleDownVote(content, { events }) {
        const model = await this._getModel(content, { votes: true, payout: true });

        if (!model) {
            return;
        }

        this._includeDownVote(model, { userId: content.voter, weight: content.weight });
        this._excludeUpVote(model, content.voter);
        await this._updatePayout(model, events);

        await model.save();
    }

    async handleUnVote(content, { events }) {
        const model = await this._getModel(content, { votes: true, payout: true });

        if (!model) {
            return;
        }

        this._excludeUpVote(model, content.voter);
        this._excludeDownVote(model, content.voter);
        await this._updatePayout(model, events);

        await model.save();
    }

    _includeUpVote(model, vote) {
        const pack = model.votes.upVotes || [];

        if (!pack.find(item => item.userId === item.userId)) {
            pack.push(vote);
            model.markModified('votes.upVotes');
            model.votes.upCount++;
        }
    }

    _includeDownVote(model, vote) {
        const pack = model.votes.downVotes || [];

        if (!pack.find(item => item.userId === vote.userId)) {
            pack.push(vote);
            model.markModified('votes.downVotes');
            model.votes.downCount++;
        }
    }

    _excludeUpVote(model, userId) {
        const pack = model.votes.upVotes || [];

        const index = pack.findIndex(item => item.userId === userId);
        if (index !== -1) {
            pack.splice(index, 1);
            model.markModified('votes.upVotes');
            model.votes.upCount--;
        }
    }

    _excludeDownVote(model, userId) {
        const pack = model.votes.downVotes || [];

        const index = pack.findIndex(item => item.userId === userId);
        if (index !== -1) {
            pack.splice(index, 1);
            model.markModified('votes.downVotes');
            model.votes.downCount--;
        }
    }

    async handleReputation({ voter, author, rshares: rShares }, content) {
        const model = await this._getModel(content, {
            payout: true,
            'meta.time': true,
            stats: true,
        });

        if (!model) {
            return;
        }

        model.stats = model.stats || {};
        model.stats.wilson = model.stats.wilson || {};
        model.stats.wilson.hot = WilsonScoring.calcHot(rShares, model.meta.time);
        model.stats.wilson.trending = WilsonScoring.calcTrending(rShares, model.meta.time);

        await this._updateProfileReputation(voter, author, rShares);

        await model.save();
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

        modelAuthor.stats.reputation += rShares;
        await modelAuthor.save();
    }

    async _getModel(content, projection) {
        const contentId = this._extractContentId(content);
        const post = await PostModel.findOne({ contentId }, projection);

        if (post) {
            return post;
        }

        const comment = await CommentModel.findOne({ contentId }, projection);

        if (comment) {
            return comment;
        }

        return null;
    }

    async _updatePayout(model, events) {
        // TODO -
    }

    _calcTotalPayout({ rewardWeight, funds, sharesfn, rsharesfn }) {
        return rewardWeight * funds * (sharesfn / rsharesfn);
    }

    _calcAuthorPayout(payout, curationPayout, benefactorPayout) {
        return payout - curationPayout - benefactorPayout;
    }

    _calcCuratorPayout(payout, sumcuratorsw) {
        return payout - sumcuratorsw * payout;
    }

    _calcBenefactorPayout(payout, curationPayout, percents) {
        const payoutDiff = payout - curationPayout;
        let result = 0;

        for (const percent of percents) {
            result += payoutDiff * percent;
        }

        return result;
    }
}

module.exports = Vote;
