const AbstractFeed = require('./AbstractFeed');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');

class Vote extends AbstractFeed {
    async getPostVotes({
        requestedUserId,
        permlink,
        type,
        app,
        limit,
        sequenceKey,
        currentUserId,
    }) {
        return await this._getVotes(PostModel, {
            requestedUserId,
            currentUserId,
            permlink,
            type,
            app,
            limit,
            sequenceKey,
        });
    }

    async getCommentVotes({
        requestedUserId,
        currentUserId,
        permlink,
        type,
        app,
        limit,
        sequenceKey,
    }) {
        return await this._getVotes(CommentModel, {
            requestedUserId,
            currentUserId,
            permlink,
            type,
            app,
            limit,
            sequenceKey,
        });
    }

    async _getVotes(
        Model,
        { requestedUserId, currentUserId, username, permlink, limit, type, sequenceKey, app }
    ) {
        if (!requestedUserId && !username) {
            throw { code: 400, message: 'Invalid user identification' };
        }

        if (!requestedUserId) {
            requestedUserId = this._getUserIdByUsername(username, app);
        }

        const query = {
            'contentId.userId': requestedUserId,
            'contentId.permlink': permlink,
        };

        if (Model.modelName !== 'Comment') {
            query['repost.isRepost'] = false;
        }

        const targetType = this._getVotesTargetType(type);
        const targetPath = `votes.${targetType}`;

        const projection = { _id: false, [`${targetPath}._id`]: false };
        const options = { lean: true };
        let skip = 0;

        if (sequenceKey) {
            skip = Number(this._unpackSequenceKey(sequenceKey));

            if (Number.isNaN(skip)) {
                throw { code: 400, message: 'Invalid sequenceKey' };
            }

            projection[targetPath] = { $slice: [skip, limit] };
        } else {
            projection[targetPath] = { $slice: [0, limit] };
        }

        const modelObject = await Model.findOne(query, projection, options);

        if (!modelObject) {
            this._throwNotFound();
        }

        const items = modelObject.votes[targetType];

        await this._populateVoters(items, app, currentUserId);

        return this._makeArrayPaginationResult(items, skip, limit);
    }

    _getVotesTargetType(type) {
        switch (type) {
            case 'like':
                return 'upVotes';
            case 'dislike':
            default:
                return 'downVotes';
        }
    }

    async _populateVoters(votes, app, userId) {
        await Promise.all(
            votes.map(async (vote, i) => {
                if (userId) {
                    await this._populateUserWithSubscribers(vote, app);
                    vote.isSubscribed = vote.subscribers.userIds.includes(userId);
                    delete vote.subscribers;
                } else {
                    await this._populateUser(vote, app);
                }
                votes[i] = vote;
            })
        );
    }
}

module.exports = Vote;
