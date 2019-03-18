const core = require('gls-core-service');
const Logger = core.utils.Logger;
const AbstractFeed = require('./AbstractFeed');
const CommentModel = require('../../models/Comment');
const PostModel = require('../../models/Post');

const UNKNOWN_PLACEHOLDER = '-';

class Comment extends AbstractFeed {
    async getComments(params) {
        const { type, fullQuery, currentUserId, sortBy } = await this._prepareQuery(params);
        const modelObjects = await CommentModel.find(...Object.values(fullQuery));

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
        const projection = { 'content.title': false, ordering: false };
        const options = { lean: true };
        const fullQuery = { query, projection, options };

        this._applySortingAndSequence(fullQuery, { sortBy, sequenceKey, limit });
        this._applyFeedTypeConditions(fullQuery, { type, requestedUserId, permlink, refBlockNum });

        return { type, fullQuery, currentUserId, sortBy };
    }

    _applySortByTime({ query, options, sequenceKey, direction }) {
        super._applySortByTime({ query, options, sequenceKey, direction });

        options.sort = { 'ordering.root': direction, 'ordering.child': direction };
    }

    async _populate(modelObjects, currentUserId, type) {
        await this._tryApplyVotesForModels({ Model: CommentModel, modelObjects, currentUserId });
        await this._populateAuthors(modelObjects);

        if (type === 'user') {
            await this._populateUserCommentsMetaForModels(modelObjects);
        }
    }

    async _populateUserCommentsMetaForModels(modelObjects) {
        for (const modelObject of modelObjects) {
            if (modelObject.parentCommentId) {
                await this._populateUserParentCommentMeta(modelObject);
            } else {
                await this._populateUserPostMeta(modelObject);
            }
        }
    }

    async _populateUserPostMeta(modelObject) {
        const id = modelObject.parent.post.contentId;
        const post = await PostModel.findOne(
            { contentId: id },
            { 'content.title': true, communityId: true }
        );

        if (post) {
            modelObject.parent.post = {
                content: { title: post.content.title },
                communityId: post.communityId,
            };
        } else {
            modelObject.parent.post = {
                content: { title: UNKNOWN_PLACEHOLDER },
                communityId: UNKNOWN_PLACEHOLDER,
            };

            Logger.error(`Comments - unknown parent post - ${JSON.stringify(id)}`);
        }

        await this._populateCommunities([modelObject.parent.post]);
    }

    async _populateUserParentCommentMeta(modelObject) {
        const id = modelObject.parentCommentId;
        const comment = await CommentModel.findOne(
            { contentId: id },
            { 'content.body.preview': true, 'parent.contentId': true }
        );

        if (comment) {
            modelObject.parentComment = {
                contentId: id,
                content: { body: { preview: comment.content.body.preview } },
            };
        } else {
            modelObject.parentComment = {
                contentId: id,
                content: { body: { preview: UNKNOWN_PLACEHOLDER } },
            };

            Logger.error(`Comments - unknown parent comment - ${JSON.stringify(id)}`);
        }

        await this._populateAuthors([modelObject.parentComment]);

        delete modelObject.parentCommentId;
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
                query['contentId.userId'] = requestedUserId;
                break;

            case 'post':
            default:
                query['parent.post.contentId.userId'] = requestedUserId;
                query['parent.post.contentId.permlink'] = permlink;
                query['parent.post.contentId.refBlockNum'] = refBlockNum;
                break;
        }
    }
}

module.exports = Comment;
