const core = require('gls-core-service');
const Content = core.utils.Content;
const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');

class Comment extends AbstractContent {
    constructor(...args) {
        super(...args);

        this._contentUtil = new Content();
    }

    async handleCreate({ args: content }, { blockTime }) {
        if (!(await this._isComment(content))) {
            return;
        }

        const model = new CommentModel({
            contentId: this._extractContentId(content),
            content: {
                title: this._extractTitle(content),
                body: {
                    preview: this._extractBodyPreview(content),
                    full: this._extractBodyFull(content),
                },
                metadata: this._extractMetadata(content),
            },
            meta: {
                time: blockTime,
            },
        });

        await this._applyParent(model, content);
        await model.save();
        await this._updatePostCommentsCount(model, 1);
    }

    async handleUpdate({ args: content }) {
        if (!(await this._isComment(content))) {
            return;
        }

        await CommentModel.updateOne(
            {
                contentId: this._extractContentId(content),
            },
            {
                content: {
                    title: this._extractTitle(content),
                    body: {
                        preview: this._extractBodyPreview(content),
                        full: this._extractBodyFull(content),
                    },
                    metadata: this._extractMetadata(content),
                },
            }
        );
    }

    async handleDelete({ args: content }) {
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
        await model.remove();
    }

    async _isComment(content) {
        const id = content.parent_id;

        if (id) {
            return Boolean(id.author);
        }

        const postCount = await CommentModel.countDocuments({
            contentId: this._extractContentId(content),
        });

        return Boolean(postCount);
    }

    async _applyParent(model, content) {
        const contentId = this._extractContentIdFromId(content.parent_id);
        const post = await this._getParentPost(contentId);

        if (post) {
            model.parent = {
                contentId,
                isPost: true,
            };
            return;
        }

        const comment = await this._getParentComment(contentId);

        if (comment) {
            model.parent = {
                contentId,
                isPost: false,
            };
        }
    }

    async _getParentPost(contentId) {
        return await PostModel.findOne({ contentId }, { contentId: true });
    }

    async _getParentComment(contentId) {
        return await CommentModel.findOne({ contentId }, { contentId: true });
    }

    async _updatePostCommentsCount(model, increment) {
        let contentId;

        if (model.parent.isPost) {
            contentId = model.parent.contentId;
        } else {
            const parentComment = await CommentModel.findOne({ parentId: model.parent.contentId });

            if (!parentComment) {
                return;
            }

            contentId = parentComment.parent.contentId;
        }

        await PostModel.updateOne({ contentId }, { $inc: { 'stats.commentsCount': increment } });
    }
}

module.exports = Comment;
