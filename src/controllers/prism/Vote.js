const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const WilsonScoring = require('../../utils/WilsonScoring');

class Vote extends AbstractContent {
    async handleUpVote(content) {
        const model = await this._getModelWithVotes(content);

        if (!model) {
            return;
        }

        this._includeUpVote(model, content.voter);
        this._excludeDownVote(model, content.voter);

        await model.save();
    }

    async handleDownVote(content) {
        const model = await this._getModelWithVotes(content);

        if (!model) {
            return;
        }

        this._includeDownVote(model, content.voter);
        this._excludeUpVote(model, content.voter);

        await model.save();
    }

    async handleUnVote(content) {
        const model = await this._getModelWithVotes(content);

        if (!model) {
            return;
        }

        this._excludeUpVote(model, content.voter);
        this._excludeDownVote(model, content.voter);

        await model.save();
    }

    _includeUpVote(model, userId) {
        const pack = model.votes.upUserIds;

        if (!pack.includes(userId)) {
            pack.push(userId);
            model.markModified('votes.upUserIds');
            model.votes.upCount++;
        }
    }

    _includeDownVote(model, userId) {
        const pack = model.votes.downUserIds;

        if (!pack.includes(userId)) {
            pack.push(userId);
            model.markModified('votes.downUserIds');
            model.votes.downCount++;
        }
    }

    _excludeUpVote(model, userId) {
        const pack = model.votes.upUserIds;

        if (pack.includes(userId)) {
            pack.splice(pack.indexOf(userId));
            model.markModified('votes.upUserIds');
            model.votes.upCount--;
        }
    }

    _excludeDownVote(model, userId) {
        const pack = model.votes.downUserIds;

        if (pack.includes(userId)) {
            pack.splice(pack.indexOf(userId));
            model.markModified('votes.downUserIds');
            model.votes.downCount--;
        }
    }

    async handleReputation({ rshares: rShares }, content) {
        const model = await this._getModel(content, {
            payout: true,
            'meta.time': true,
            stats: true,
        });

        if (!model) {
            return;
        }

        model.payout.rShares = rShares;
        model.stats = model.stats || {};
        model.stats.wilson = model.stats.wilson || {};
        model.stats.wilson.hot = WilsonScoring.calcHot(rShares, model.meta.time);
        model.stats.wilson.trending = WilsonScoring.calcTrending(rShares, model.meta.time);

        await model.save();
    }

    async _getModelWithVotes(content) {
        return await this._getModel(content, { votes: true });
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
}

module.exports = Vote;
