const Abstract = require('./Abstract');
const CommentModel = require('../../models/Comment');

// TODO Remove after MVP
const HARDCODE_COMMUNITY_ID = 'GOLOSID';
const HARDCODE_COMMUNITY_NAME = 'GOLOSNAME';

// TODO REMOVE AFTER USER CREATION LOGIC
const TMP_USER_ID_PREFIX = 'GOLOS_TMP_ID';

class Comment extends Abstract {
    async handleCreate({ args: content }, blockNum) {
        if (!this._isComment(content)) {
            return;
        }

        const userId = await this._getUserId(content);
        const model = new CommentModel({
            id: await this._makeId(content, blockNum),
            // TODO -
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

    async _getUserId(content) {
        return TMP_USER_ID_PREFIX + content.account;
    }
}

module.exports = Comment;
