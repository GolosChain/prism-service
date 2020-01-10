const core = require('cyberway-core-service');
const Content = core.utils.Content;
const BigNum = core.types.BigNum;
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

        const model = await PostModel.create({
            communityId,
            contentId,
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

        await this.registerForkChanges({ type: 'create', Model: PostModel, documentId: model._id });
        await this.updateUserPostsCount(contentId.userId, 1);
    }

    async handleUpdate(content) {
        if (!(await this._isPost(content))) {
            return;
        }

        const contentId = this._extractContentId(content);
        const previousModel = await PostModel.findOneAndUpdate(
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

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: PostModel,
                documentId: previousModel._id,
                data: {
                    $set: {
                        content: previousModel.content.toObject(),
                    },
                },
            });
        }
    }

    async handleDelete(content) {
        if (!(await this._isPost(content))) {
            return;
        }

        const contentId = this._extractContentId(content);
        const previousModel = await PostModel.findOneAndRemove({
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
        });

        await this.registerForkChanges({
            type: 'remove',
            Model: PostModel,
            documentId: previousModel._id,
            data: previousModel.toObject(),
        });
        await this.updateUserPostsCount(contentId.userId, -1);
    }

    async handleRepost({ rebloger: userId, ...content }, { communityId, blockTime }) {
        const model = await PostModel.create({
            communityId,
            contentId: this._extractContentId(content),
            repost: {
                isRepost: true,
                userId,
                body: {
                    raw: this._extractBodyRaw(content),
                },
                time: blockTime,
            },
        });

        await this.registerForkChanges({ type: 'create', Model: PostModel, documentId: model._id });
    }

    async handleRemoveRepost({ rebloger: userId, ...content }, { communityId }) {
        const contentId = this._extractContentId(content);
        const previousModel = await PostModel.findOneAndRemove({
            communityId,
            'repost.userId': userId,
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
        });

        if (!previousModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'remove',
            Model: PostModel,
            documentId: previousModel._id,
            data: previousModel.toObject(),
        });
    }
}

module.exports = Post;
