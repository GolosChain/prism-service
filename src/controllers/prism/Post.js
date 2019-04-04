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

        const contentId = this._extractContentId(content);

        await PostModel.create({
            communityId,
            contentId,
            content: await this._extractContentObject(content),
            meta: {
                time: blockTime,
            },
        });
        await this._updateUserPostCount(contentId.userId, 1);
    }

    async handleUpdate({ args: content }) {
        if (!(await this._isPost(content))) {
            return;
        }

        await PostModel.updateOne(
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
        if (!(await this._isPost(content))) {
            return;
        }

        const contentId = this._extractContentId(content);

        await PostModel.deleteOne({ contentId });
        await this._updateUserPostCount(contentId.userId, -1);
    }

    async _updateUserPostCount(userId, increment) {
        await ProfileModel.updateOne({ userId }, { $inc: { 'stats.postsCount': increment } });
    }
}

module.exports = Post;
