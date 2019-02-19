const core = require('gls-core-service');
const Logger = core.utils.Logger;
const AbstractFeed = require('./AbstractFeed');
const CommentModel = require('../../models/Comment');
const PostModel = require('../../models/Post');

class Comment extends AbstractFeed {
    async getComments(params) {
        const { type, fullQuery, currentUserId, sortBy } = await this._prepareQuery(params);
        const modelObjects = await CommentModel.find(...fullQuery);

        if (!modelObjects || modelObjects.length === 0) {
            return this._makeEmptyFeedResult();
        }

        await this._populate(modelObjects, currentUserId, type);

        return this._makeFeedResult(modelObjects, sortBy);
    }

    async _prepareQuery(params) {
        const {
            sortBy,
            sequenceKey,
            limit,
            currentUserId,
            requestedUserId,
            permlink,
            refBlockNum,
            type,
        } = this._normalizeParams(params);

        const query = {};
        const projection = {};
        const options = { lean: true };
        const fullQuery = { query, projection, options };

        this._applySortingAndSequence(fullQuery, { sortBy, sequenceKey, limit });
        this._applyFeedTypeConditions(fullQuery, { type, requestedUserId, permlink, refBlockNum });

        return { type, fullQuery, currentUserId, sortBy };
    }

    async _populate(modelObjects, currentUserId, type) {
        this._tryApplyVotesForModels({ Model: CommentModel, modelObjects, currentUserId });
        await this._populateAuthors(modelObjects);

        if (type === 'user') {
            await this._populateUserCommentsMetaForModels();
        }
    }

    async _populateUserCommentsMetaForModels(modelObjects) {
        for (const modelObject of modelObjects) {
            if (modelObject.parentCommentId) {
                await this._populateUserParentCommentMeta(modelObjects);
            } else {
                await this._populateUserPostMeta(modelObjects);
            }
        }
    }

    async _populateUserPostMeta(modelObject) {
        const id = modelObject.postId;
        const post = await PostModel.findOne({ id }, { 'content.title': true });

        if (!post) {
            Logger.error(`Comments - unknown parent post - ${JSON.stringify(id)}`);
            return;
        }

        modelObject.post = { id, content: { title: post.content.title } };

        delete modelObject.postId;
    }

    async _populateUserParentCommentMeta(modelObject) {
        const id = modelObject.parentCommentId;
        const comment = await CommentModel.findOne({ id }, { 'content.body.preview': true });

        if (!comment) {
            Logger.error(`Comments - unknown parent comment - ${JSON.stringify(id)}`);
            return;
        }

        modelObject.parentComment = {
            id,
            content: { body: { preview: comment.content.body.preview } },
        };
    }

    _normalizeParams({
        type = 'post',
        currentUserId = null,
        requestedUserId = null,
        permlink,
        refBlockNum,
        ...params
    }) {
        params = super._normalizeParams(params);

        type = String(type);
        permlink = String(permlink);
        refBlockNum = Number(refBlockNum);

        if (currentUserId) {
            currentUserId = String(currentUserId);
        }

        if (requestedUserId) {
            requestedUserId = String(requestedUserId);
        }

        return {
            type,
            currentUserId,
            requestedUserId,
            permlink,
            refBlockNum,
            ...params,
        };
    }

    _applyFeedTypeConditions({ query }, { type, requestedUserId, permlink, refBlockNum }) {
        switch (type) {
            case 'user':
                query['id.userId'] = requestedUserId;
                break;

            case 'post':
            default:
                query['postId.userId'] = requestedUserId;
                query['postId.permlink'] = permlink;
                query['postId.refBlockNum'] = refBlockNum;
                break;
        }
    }
}

module.exports = Comment;
