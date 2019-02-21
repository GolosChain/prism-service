const core = require('gls-core-service');
const Content = core.utils.Content;
const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');

class Post extends AbstractContent {
    constructor(...args) {
        super(...args);

        this._contentUtil = new Content();
    }

    async handleCreate({ args: content }, { communityId, blockTime }) {
        if (!(await this._isPost(content))) {
            return;
        }

        await PostModel.create({
            communityId,
            contentId: {
                userId: content.message_id.author,
                permlink: content.message_id.permlink,
                refBlockNum: content.message_id.ref_block_num,
            },
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

        await this._updateUserPostCount(content.message_id.author, 1);
    }

    async handleUpdate({ args: content }) {
        if (!(await this._isPost(content))) {
            return;
        }

        await PostModel.updateOne(
            {
                contentId: {
                    userId: content.message_id.author,
                    permlink: content.message_id.permlink,
                    refBlockNum: content.message_id.ref_block_num,
                },
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
        if (!(await this._isPost(content))) {
            return;
        }

        await PostModel.deleteOne({
            contentId: {
                userId: content.message_id.author,
                permlink: content.message_id.permlink,
                refBlockNum: content.message_id.ref_block_num,
            },
        });
    }

    async _isPost(content) {
        const id = content.parent_id;

        if (id) {
            return !Boolean(id.author);
        }

        const postCount = await PostModel.count({
            contentId: {
                userId: content.message_id.author,
                permlink: content.message_id.permlink,
                refBlockNum: content.message_id.ref_block_num,
            },
        });

        return Boolean(postCount);
    }

    async _updateUserPostCount(userId, increment) {
        await ProfileModel.updateOne({ userId }, { $inc: { 'stats.postsCount': increment } });
    }
}

module.exports = Post;
