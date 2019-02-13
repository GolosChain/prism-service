const core = require('gls-core-service');
const Content = core.utils.Content;
const AbstractContent = require('./AbstractContent');
const CommentModel = require('../../models/Comment');

// TODO Remove after MVP
const HARDCODE_COMMUNITY_ID = 'GOLOSID';
const HARDCODE_COMMUNITY_NAME = 'GOLOSNAME';

// TODO REMOVE AFTER USER CREATION LOGIC
const TMP_USER_ID_PREFIX = 'GOLOS_TMP_ID';

// TODO Extract parent

class Comment extends AbstractContent {
    constructor(...args) {
        super(...args);

        this._contentUtil = new Content();
    }

    async handleCreate({ args: content }, blockNum) {
        if (!this._isComment(content)) {
            return;
        }

        console.log(content);
        return; // TODO -

        const model = new CommentModel({
            id: await this._makeId(content, blockNum),
            post: {
                id: '', // TODO -
                content: {
                    title: '', // TODO -
                },
            },
            parentComment: {
                id: '', // TODO -
                content: {
                    body: {
                        preview: '', // TODO -
                    },
                },
            },
            user: {
                id: content.account,
                name: content.account, // TODO Change to community account name
                avatarUrl: 'none', // TODO Get user and add avatar here
            },
            content: {
                title: content.headermssg,
                body: {
                    full: this._contentUtil.sanitize(content.bodymssg),
                },
                metadata: {
                    type: this._extractMetadata(content),
                },
            },
            meta: {
                // TODO Change after blockchain implement block time
                time: new Date(),
            },
        });

        await model.save();
    }

    async handleUpdate({ args: content }, blockNum) {
        if (!this._isComment(content)) {
            return;
        }

        const model = await CommentModel.findOne({}); // TODO -

        if (!model) {
            // Can be valid in blockchain as transaction,
            // but invalid as logic (comment not found in blockchain)
            return;
        }

        // TODO -
    }

    async handleDelete({ args: content }, blockNum) {
        if (!this._isComment(content)) {
            return;
        }

        const model = await CommentModel.findOne({}); // TODO -

        if (!model) {
            // Can be valid in blockchain as transaction,
            // but invalid as logic (comment not found in blockchain)
            return;
        }

        // TODO -
    }

    _isComment(content) {
        return Boolean(content.parentacc);
    }

    async _makeId(content, blockNum) {
        return [blockNum, HARDCODE_COMMUNITY_ID, content.account, content.permlink].join(':');
    }
}

module.exports = Comment;
