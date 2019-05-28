const core = require('gls-core-service');
const Content = core.utils.Content;
const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');

class Post extends AbstractContent {
    constructor(...args) {
        super(...args);

        this._contentUtil = new Content();
    }

    async handleCreate(content, { communityId, blockTime }) {
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
            payout: {
                meta: {
                    tokenProp: Number(content.tokenprop),
                    benefactorPercents: this._extractBenefactorPercents(content),
                },
            },
        });
        await this.updateUserPostsCount(contentId.userId, 1);
    }

    async handleUpdate(content) {
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

    async handleDelete(content) {
        if (!(await this._isPost(content))) {
            return;
        }

        const contentId = this._extractContentId(content);

        await PostModel.deleteOne({ contentId });
        await this.updateUserPostsCount(contentId.userId, -1);
    }

    async handleRepost({ rebloger: userId, ...content }, { communityId, blockTime }) {
        await PostModel.create({
            communityId,
            contentId: this._extractContentId(content),
            repost: {
                isRepost: true,
                userId,
                body: {
                    raw: this._extractBodyRaw(content),
                },
            },
            meta: {
                time: blockTime,
            },
        });
    }
}

module.exports = Post;
