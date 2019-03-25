const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Profile = require('../../models/Profile');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

class Notify extends BasicController {
    async getMeta({ userId, communityId, postId, commentId, contentId }) {
        const result = {};

        if (userId) {
            result.user = await this._getUserData(userId);
        }

        if (communityId) {
            result.community = await this._getCommunityData(communityId);
        }

        if (postId) {
            result.post = await this._getPostData(postId);
        }

        if (commentId) {
            result.comment = await this._getCommentData(commentId);
        }

        if (contentId) {
            const { post, comment } = await this._getContentData(contentId);

            if (post) {
                result.post = post;
            } else {
                result.comment = comment;
            }
        }

        return result;
    }

    async _getUserData(userId) {
        const data = await Profile.findOne(
            { userId },
            { _id: false, username: true, 'personal.avatarUrl': true }
        );

        if (!data) {
            throw { code: 404, message: 'User not found' };
        }

        return {
            id: userId,
            username: data.username,
            avatarUrl: data.personal.avatarUrl,
        };
    }

    async _getCommunityData(communityId) {
        // TODO Wait for blockchain
        return {
            id: 'gls',
            name: 'Golos',
        };
    }

    async _getPostData(contentId) {
        const data = await Post.findOne(
            { contentId },
            { _id: false, 'content.title': true },
            { lean: true }
        );

        if (!data) {
            throw { code: 404, message: 'Post not found' };
        }

        return {
            contentId,
            title: data.content.title,
        };
    }

    async _getCommentData(contentId) {
        const data = await Comment.findOne(
            { contentId },
            { _id: false, 'content.body.preview': true },
            { lean: true }
        );

        if (!data) {
            throw { code: 404, message: 'Comment not found' };
        }

        return {
            contentId,
            body: data.content.body.preview,
        };
    }

    async _getContentData(contentId) {
        try {
            return { post: await this._getPostData(contentId) };
        } catch (error) {
            if (error.code !== 404) {
                throw error;
            }
        }

        try {
            return { comment: await this._getCommentData(contentId) };
        } catch (error) {
            if (error.code !== 404) {
                throw error;
            }
        }

        throw { code: 404, message: 'Content not found' };
    }
}

module.exports = Notify;
