const ProfileModel = require('../../models/Profile');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const SubscribeController = require('./Subscribe');
const PostController = require('./Post');
const CommentController = require('./Comment');

class Genesis {
    constructor() {
        this._subscribeController = new SubscribeController();
        this._postController = new PostController();
        this._commentController = new CommentController();
    }

    async handle(type, data) {
        switch (type) {
            case 'username':
                await this._handleUsername(data);
                break;

            case 'pin':
                await this._handleSubscribe(data);
                break;

            case 'message':
                await this._handleContent(data);
                break;

            default:
            // Do nothing
        }
    }

    async _handleUsername({ owner: userId, name }) {
        await ProfileModel.create({ userId, usernames: { gls: name } });
    }

    async _handleSubscribe({ pinner, pinning }) {
        await this._subscribeController.pin({ pinner, pinning });
    }

    // TODO Rewards, reblogs
    async _handleContent({
        author: userId,
        permlink,
        title,
        body,
        tags,
        votes,
        parent_author: parentAuthor,
        parent_permlink: parentPermlink,
    }) {
        if (parentAuthor) {
            await this._handleComment({
                userId,
                permlink,
                title,
                body,
                votes,
                parentContentId: {
                    userId: parentAuthor,
                    permlink: parentPermlink,
                },
            });
        } else {
            await this._handlePost({ userId, permlink, title, body, tags, votes });
        }
    }

    async _handlePost({ userId, permlink, title, body, tags, votes }) {
        const model = new PostModel({
            communityId: 'gls',
            contentId: {
                userId,
                permlink,
            },
            content: this._postController.extractContentObjectFromGenesis({ title, body }),
            tags,
        });

        this._applyVotes(model, votes);

        await model.save();
        await this._postController.updateUserPostsCount(userId, 1);
    }

    async _handleComment({ userId, permlink, title, body, votes, parentContentId }) {
        const controller = this._commentController;
        const contentId = { userId, permlink };
        const model = new CommentModel({
            communityId: 'gls',
            contentId,
            content: controller.extractContentObjectFromGenesis({ title, body }),
        });

        this._applyVotes(model, votes);

        await controller.applyParentById(model, parentContentId);
        await controller.applyOrdering(model);
        await model.save();
        await controller.updatePostCommentsCount(model, 1);
        await controller.updateUserCommentsCount(userId, 1);
    }

    _applyVotes(model, votes) {
        model.votes = {
            upVotes: [],
            upCount: 0,
            downVotes: [],
            downCount: 0,
        };

        for (const { voter: userId, weight } of votes) {
            const vote = { userId, weight }
            if (weight > 0) {
                model.votes.upVotes.push(vote);
                model.votes.upCount++;
            } else if (weight < 0) {
                model.votes.downVotes.push(vote);
                model.votes.downCount++;
            }
        }
    }
}

module.exports = Genesis;
