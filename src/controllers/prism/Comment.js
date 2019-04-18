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

    async handleCreate(content, { blockTime }) {
        if (!(await this._isComment(content))) {
            return;
        }

        const model = new CommentModel({
            contentId: this._extractContentId(content),
            content: await this._extractContentObject(content),
            meta: {
                time: blockTime,
            },
        });

        await this._applyParent(model, content);
        await this._applyOrdering(model);
        await model.save();
        await this._updatePostCommentsCount(model, 1);
        await this._updateUserCommentsCount(model.contentId.userId, 1);
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

        await this._updatePostCommentsCount(model, -1);
        await this._updateUserPostsCount(model.contentId.userId, -1);
        await model.remove();
    }

    async _applyParent(model, content) {
        const contentId = this._extractContentIdFromId(content.parent_id);
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

    async _getParentPost(contentId) {
        const post = await PostModel.findOne({ contentId }, { contentId: true });

        if (post) {
            return post;
        }

        const comment = await CommentModel.findOne({ contentId }, { 'parent.post': true });

        if (comment.parent) {
            return comment.parent.post;
        }

        return null;
    }

    async _getParentComment(contentId) {
        return await CommentModel.findOne({ contentId }, { contentId: true, parent: true });
    }

    async _updatePostCommentsCount(model, increment) {
        await PostModel.updateOne(
            { contentId: model.parent.post.contentId },
            { $inc: { 'stats.commentsCount': increment } }
        );
    }

    async _applyOrdering(model) {
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

    async _updateUserCommentsCount(userId, increment) {
        await ProfileModel.updateOne({ userId }, { $inc: { 'stats.commentsCount': increment } });
    }
}

module.exports = Comment;
