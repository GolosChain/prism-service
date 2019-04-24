const core = require('gls-core-service');
const Logger = core.utils.Logger;
const AbstractFeed = require('./AbstractFeed');
const CommentModel = require('../../models/Comment');
const PostModel = require('../../models/Post');

const UNKNOWN_PLACEHOLDER = '-';

class Comment extends AbstractFeed {
    async getComment({ currentUserId, requestedUserId, permlink, refBlockNum, contentType }) {
        const modelObject = await this._getContent(CommentModel, {
            currentUserId,
            requestedUserId,
            permlink,
            refBlockNum,
            contentType,
        });

        this._removeEmptyParents(modelObject);

        return modelObject;
    }

    async getComments(params) {
        const { type, fullQuery, currentUserId, sortBy, limit } = await this._prepareQuery(params);
        const modelObjects = await CommentModel.find(...Object.values(fullQuery));

        if (!modelObjects || modelObjects.length === 0) {
            return this._makeEmptyFeedResult();
        }

        await this._populate(modelObjects, currentUserId, type);
        this._removeEmptyParentsForAll(modelObjects);

        return this._makeFeedResult(modelObjects, { sortBy, limit });
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
            contentType,
        } = this._normalizeParams(params);

        const query = {};
        const projection = {
            'content.title': false,
            'content.body.preview': false,
            ordering: false,
        };
        const options = { lean: true };
        const fullQuery = { query, projection, options };

        this._applySortingAndSequence(fullQuery, { sortBy, sequenceKey, limit, contentType });
        this._applyFeedTypeConditions(fullQuery, { type, requestedUserId, permlink, refBlockNum });

        return { type, fullQuery, currentUserId, sortBy, limit };
    }

    _applySortByTime({ query, options, sequenceKey, direction }) {
        super._applySortByTime({ query, options, sequenceKey, direction });

        options.sort = { 'ordering.byTime': direction };
    }

    async _populate(modelObjects, currentUserId, type) {
        await this._tryApplyVotesForModels({ Model: CommentModel, modelObjects, currentUserId });
        await this._populateAuthors(modelObjects);

        if (type === 'user' || type === 'replies') {
            await this._populateUserCommentsMetaForModels(modelObjects);
        }
    }

    async _populateUserCommentsMetaForModels(modelObjects) {
        for (const modelObject of modelObjects) {
            if (modelObject.parent.comment && modelObject.parent.comment.contentId) {
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
                ...modelObject.parent.post,
            };
        } else {
            modelObject.parent.post = {
                content: { title: UNKNOWN_PLACEHOLDER },
                communityId: UNKNOWN_PLACEHOLDER,
                ...modelObject.parent.post,
            };

            Logger.error(`Comments - unknown parent post - ${JSON.stringify(id)}`);
        }

        await this._populateCommunities([modelObject.parent.post]);
    }

    async _populateUserParentCommentMeta(modelObject) {
        const id = modelObject.parent.comment.contentId;
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
    }

    _normalizeParams({ type, currentUserId, requestedUserId, permlink, refBlockNum, ...params }) {
        return {
            type,
            currentUserId,
            requestedUserId,
            permlink,
            refBlockNum,
            ...super._normalizeParams(params),
        };
    }

    _applyFeedTypeConditions({ query }, { type, requestedUserId, permlink, refBlockNum }) {
        switch (type) {
            case 'user':
                query['contentId.userId'] = requestedUserId;
                break;

            case 'replies':
                query.$or = [
                    { 'parent.post.contentId.userId': requestedUserId },
                    { 'parent.comment.contentId.userId': requestedUserId },
                ];
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
