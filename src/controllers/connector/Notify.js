const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Profile = require('../../models/Profile');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

class Notify extends BasicController {
    async getMeta({ userId, communityId, postId, commentId }) {
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

        return result;
    }

    async _getUserData(userId) {
        const data = await Profile.findOne(
            { userId },
            { _id: false, username: true, 'personal.avatarUrl': true },
            { lean: true }
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
}

module.exports = Notify;
