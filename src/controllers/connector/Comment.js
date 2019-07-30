const core = require('gls-core-service');
const Logger = core.utils.Logger;
const AbstractFeed = require('./AbstractFeed');
const CommentModel = require('../../models/Comment');
const PostModel = require('../../models/Post');

const UNKNOWN_PLACEHOLDER = '-';

class Comment extends AbstractFeed {
    async getComment({ currentUserId, requestedUserId, permlink, contentType, username, app }) {
        const modelObject = await this._getContent(CommentModel, {
            currentUserId,
            requestedUserId,
            permlink,
            contentType,
            username,
            app,
        });

        this._removeEmptyParents(modelObject);

        return modelObject;
    }

    async getComments(params) {
        await this._tryApplyUserIdByName(params);

        if (params.type === 'replies' && !params.requestedUserId) {
            throw { code: 400, message: 'Invalid userId' };
        }

        const { type, fullQuery, currentUserId, sortBy, limit, app } = await this._prepareQuery(
            params
        );
        const modelObjects = await CommentModel.find(...Object.values(fullQuery));

        if (!modelObjects || modelObjects.length === 0) {
            return this._makeEmptyFeedResult();
        }

        await this._populate(modelObjects, currentUserId, type, app);
        this._removeEmptyParentsForAll(modelObjects);

        const communityId = modelObjects[0].communityId || (modelObjects[0].community || {}).id;

        await this._applyPayouts(modelObjects, communityId);

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
            type,
            contentType,
            app,
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
        this._applyFeedTypeConditions(fullQuery, { type, requestedUserId, permlink });

        return { type, fullQuery, currentUserId, sortBy, limit, app };
    }

    _applySortByTime({ query, options, sequenceKey, direction }) {
        super._applySortByTime({ query, options, sequenceKey, direction });

        options.sort = { 'meta.time': direction };
    }

    async _populate(modelObjects, currentUserId, type, app) {
        await this._tryApplyVotesForModels({ Model: CommentModel, modelObjects, currentUserId });
        await this._populateAuthors(modelObjects, app);

        if (type === 'user' || type === 'replies') {
            await this._populateUserCommentsMetaForModels(modelObjects);
        }
    }

    async _populateUserCommentsMetaForModels(modelObjects) {
        for (const modelObject of modelObjects) {
            if (!modelObject.parent) {
                Logger.warn(`Empty parent - ${JSON.stringify(modelObject.contentId)}`);
                continue;
            }

            if (modelObject.parent.comment && modelObject.parent.comment.contentId) {
                await this._populateUserParentCommentMeta(modelObject);
            } else {
                await this._populateUserPostMeta(modelObject);
            }
        }
    }

    async _populateUserPostMeta(modelObject) {
        let post;
        let id;

        if (modelObject.parent.post) {
            id = modelObject.parent.post.contentId;
            post = await PostModel.findOne(
                { 'contentId.userId': id.userId, 'contentId.permlink': id.permlink },
                { 'content.title': true, communityId: true }
            );
        }

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

            if (id) {
                Logger.error(`Comments - unknown parent post - ${JSON.stringify(id)}`);
            }
        }

        await this._populateCommunities([modelObject.parent.post]);
    }

    async _populateUserParentCommentMeta(modelObject) {
        const id = modelObject.parent.comment.contentId;
        const comment = await CommentModel.findOne(
            { 'contentId.userId': id.userId, 'contentId.permlink': id.permlink },
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

    _normalizeParams({ type, currentUserId, requestedUserId, permlink, ...params }) {
        return {
            type,
            currentUserId,
            requestedUserId,
            permlink,
            ...super._normalizeParams(params),
        };
    }

    _applyFeedTypeConditions({ query }, { type, requestedUserId, permlink }) {
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
                break;
        }
    }
}

module.exports = Comment;
