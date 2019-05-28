const core = require('gls-core-service');
const Content = core.utils.Content;
const Logger = core.utils.Logger;
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
                    tokenProp: Number(content.tokenprop),
                    benefactorPercents: this._extractBenefactorPercents(content),
                },
            },
        });

        await this.applyParentByContent(model, content);
        await this.applyOrdering(model);
        await model.save();
        await this.updatePostCommentsCount(model, 1);
        await this.updateUserCommentsCount(model.contentId.userId, 1);
    }

    async handleUpdate(content) {
        if (!(await this._isComment(content))) {
            return;
        }

        await CommentModel.updateOne(
            {
                contentId: this._extractContentId(content),
            },
            {
                $set: {
                    content: await this._extractContentObject(content),
                },
            }
        );
    }

    async handleDelete(content) {
        if (!(await this._isComment(content))) {
            return;
        }

        const model = await CommentModel.findOne({
            contentId: this._extractContentId(content),
        });

        if (!model) {
            return;
        }

        await this.updatePostCommentsCount(model, -1);
        await this.updateUserPostsCount(model.contentId.userId, -1);
        await model.remove();
    }

    async updatePostCommentsCount(model, increment) {
        await PostModel.updateOne(
            { contentId: model.parent.post.contentId },
            { $inc: { 'stats.commentsCount': increment } }
        );
    }

    async updateUserCommentsCount(userId, increment) {
        await ProfileModel.updateOne({ userId }, { $inc: { 'stats.commentsCount': increment } });
    }

    async applyParentById(model, contentId) {
        const post = await this._getParentPost(contentId);

        if (post) {
            model.parent.post.contentId = contentId;
            model.parent.comment.contentId = null;
            return;
        }

        const comment = await this._getParentComment(contentId);

        if (comment) {
            model.parent.post.contentId = comment.parent.post.contentId;
            model.parent.comment.contentId = contentId;
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
            { contentId: parentCommentId },
            { 'ordering.byTime': true }
        );

        if (!parentComment) {
            Logger.warn(`Unknown parent comment for ordering - ${parentCommentId}`);
            return;
        }

        model.ordering.byTime = `${parentComment.ordering.byTime}-${Date.now()}`;
    }

    async _getParentPost(contentId) {
        return await PostModel.findOne({ contentId }, { contentId: true });
    }

    async _getParentComment(contentId) {
        return await CommentModel.findOne({ contentId }, { contentId: true, parent: true });
    }
}

module.exports = Comment;
