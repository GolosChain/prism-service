const core = require('gls-core-service');
const Content = core.utils.Content;
const Logger = core.utils.Logger;
const BigNum = core.types.BigNum;
const { NESTED_COMMENTS_MAX_INDEX_DEPTH } = require('../../data/constants');
const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const ProfileModel = require('../../models/Profile');

class Comment extends AbstractContent {
    constructor(...args) {
        super(...args);

        this._contentUtil = new Content();
    }

    async handleCreate(content, { communityId, blockTime }) {
        if (!(await this._isComment(content))) {
            return;
        }

        const model = new CommentModel({
            communityId,
            contentId: this._extractContentId(content),
            content: await this._extractContentObject(content),
            meta: {
                time: blockTime,
            },
            payout: {
                meta: {
                    tokenProp: new BigNum(content.tokenprop),
                    benefactorPercents: this._extractBenefactorPercents(content),
                    curatorsPercent: new BigNum(content.curators_prcnt),
                },
            },
        });

        await this.applyParentByContent(model, content);
        await this.applyOrdering(model);
        await model.save();
        await this.registerForkChanges({
            type: 'create',
            Model: CommentModel,
            documentId: model._id,
        });
        await this.updatePostCommentsCount(model, 1);
        await this.updateUserCommentsCount(model.contentId.userId, 1);
    }

    async handleUpdate(content) {
        if (!(await this._isComment(content))) {
            return;
        }

        const contentId = this._extractContentId(content);
        const previousModel = await CommentModel.findOneAndUpdate(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
            },
            {
                $set: {
                    content: await this._extractContentObject(content),
                },
            }
        );

        if (!previousModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: CommentModel,
            documentId: previousModel._id,
            data: {
                $set: {
                    content: previousModel.content.toObject(),
                },
            },
        });
    }

    async handleDelete(content) {
        if (!(await this._isComment(content))) {
            return;
        }

        const contentId = this._extractContentId(content);
        const model = await CommentModel.findOne({
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
        });

        if (!model) {
            return;
        }

        await this.updatePostCommentsCount(model, -1);
        await this.updateUserPostsCount(model.contentId.userId, -1);

        const removed = await model.remove();

        await this.registerForkChanges({
            type: 'remove',
            Model: CommentModel,
            documentId: removed._id,
            data: removed.toObject(),
        });
    }

    async updatePostCommentsCount(model, increment) {
        const contentId = model.parent.post.contentId;
        const previousModel = await PostModel.findOneAndUpdate(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
            },
            { $inc: { 'stats.commentsCount': increment } }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: PostModel,
                documentId: previousModel._id,
                data: { $inc: { 'stats.commentsCount': -increment } },
            });
        }
    }

    async updateUserCommentsCount(userId, increment) {
        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId },
            { $inc: { 'stats.commentsCount': increment } }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: ProfileModel,
                documentId: previousModel._id,
                data: { $inc: { 'stats.commentsCount': -increment } },
            });
        }
    }

    async applyParentById(model, contentId) {
        const post = await this._getParentPost(contentId);

        if (post) {
            model.parent.post.contentId = contentId;
            model.parent.comment.contentId = null;
            model.nestedLevel = 1;
            return;
        }

        const comment = await this._getParentComment(contentId);

        if (comment) {
            model.parent.post.contentId = comment.parent.post.contentId;
            model.parent.comment.contentId = contentId;
            model.nestedLevel = comment.nestedLevel + 1;
        }
    }

    async applyParentByContent(model, content) {
        const contentId = this._extractContentIdFromId(content.parent_id);

        await this.applyParentById(model, contentId);
    }

    async applyOrdering(model) {
        if (!model.parent.comment.contentId.userId) {
            model.ordering.byTime = Date.now().toString();
            return;
        }

        const parentCommentId = model.parent.comment.contentId;
        const parentComment = await CommentModel.findOne(
            {
                'contentId.userId': parentCommentId.userId,
                'contentId.permlink': parentCommentId.permlink,
            },
            { 'ordering.byTime': true, nestedLevel: true },
            { lean: true }
        );

        if (!parentComment) {
            Logger.warn(`Unknown parent comment for ordering - ${parentCommentId}`);
            return;
        }

        let indexBase = parentComment.ordering.byTime;

        // Если уровень вложенности превышает максимум, то удаляем из индекса ключ родителя
        // и на его место ставим индес текущего комментария.
        if (parentComment.nestedLevel >= NESTED_COMMENTS_MAX_INDEX_DEPTH) {
            indexBase = indexBase
                .split('-')
                .slice(0, NESTED_COMMENTS_MAX_INDEX_DEPTH - 1)
                .join('-');
        }

        model.ordering.byTime = `${indexBase}-${Date.now()}`;
    }

    async _getParentPost(contentId) {
        return await PostModel.findOne(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
            },
            { contentId: true }
        );
    }

    async _getParentComment(contentId) {
        return await CommentModel.findOne(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
            },
            { contentId: true, parent: true, nestedLevel: true },
            { lean: true }
        );
    }
}

module.exports = Comment;
