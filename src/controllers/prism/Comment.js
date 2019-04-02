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
            content: await this._extractContentObject(content),
            meta: {
                time: blockTime,
            },
        });

        await this._applyParent(model, content);
        await this._applyOrdering(model);
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
                $set: {
                    content: await this._extractContentObject(content),
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
        return await PostModel.findOne({ contentId }, { contentId: true });
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
        const comments = await CommentModel.find(
            { 'parent.post.contentId': model.parent.post.contentId },
            { contentId: true, parent: true, ordering: true },
            { 'ordering.root': 1, 'ordering.child': 1 }
        );

        if (!comments || !comments.length) {
            this._applyFirstOrdering(model);
            return;
        }

        if (!model.parent.comment.contentId.userId) {
            this._applyRootOrdering(model, comments);
            return;
        }

        this._applyChildOrdering(model, comments);

        model.ordering.root = model.ordering.root || 0;
        model.ordering.child = model.ordering.child || 0;
    }

    _applyFirstOrdering(model) {
        model.ordering.root = 0;
        model.ordering.child = 0;
    }

    _applyRootOrdering(model, comments) {
        for (const comment of comments.slice().reverse()) {
            if (comment.ordering.child === 0) {
                model.ordering.root = comment.ordering.root + 1;
                break;
            }
        }

        model.ordering.root = model.ordering.root || 0;
        model.ordering.child = 0;
    }

    _applyChildOrdering(model, comments) {
        const parentId = model.parent.comment.contentId;
        let outside = true;
        let atStart = true;
        let currentChildNum = 0;

        for (const comment of comments) {
            if (outside) {
                if (this._isContentIdEquals(parentId, comment.contentId)) {
                    outside = false;
                    model.ordering.root = comment.ordering.root;
                }
            } else {
                atStart = false;

                if (comment.ordering.root !== model.ordering.root) {
                    model.ordering.child = currentChildNum + 1;
                }

                currentChildNum = comment.ordering.child;
            }
        }

        if (!outside && atStart) {
            model.ordering.child = model.ordering.child || 1;
        } else {
            model.ordering.child = model.ordering.child || 0;
        }
    }
}

module.exports = Comment;
