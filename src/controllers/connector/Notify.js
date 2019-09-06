const AbstractContent = require('./AbstractContent');
const Profile = require('../../models/Profile');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');

class Notify extends AbstractContent {
    async getMeta({ userId, communityId, postId, commentId, contentId, username, app }) {
        const result = {};

        if (userId) {
            result.user = await this._getUserData(userId, username, app);
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

    async _getUserData(userId, username, app) {
        if (!app) {
            throw { code: 400, message: 'app required' };
        }

        const params = { requestedUserId: userId, username, app };

        await this._tryApplyUserIdByName(params);

        const resolvedUserId = params.requestedUserId;
        const profile = await Profile.findOne(
            { userId: resolvedUserId },
            { _id: false, usernames: true, [`personal.${app}.avatarUrl`]: true }
        );

        if (!profile) {
            throw { code: 404, message: 'User not found' };
        }

        profile.personal = profile.personal || {};
        profile.personal[app] = profile.personal[app] || {};
        profile.usernames = profile.usernames || {};

        return {
            userId: resolvedUserId,
            username: profile.usernames[app] || null,
            avatarUrl: profile.personal[app].avatarUrl || null,
        };
    }

    async _getCommunityData(communityId) {
        // TODO Wait for blockchain
        return {
            id: 'gls',
            name: 'Golos',
            avatarUrl: null,
        };
    }

    async _getPostData(contentId) {
        const data = await Post.findOne(
            { 'contentId.userId': contentId.userId, 'contentId.permlink': contentId.permlink },
            { _id: false, 'content.title': true, repost: true },
            { lean: true }
        );

        if (!data) {
            throw { code: 404, message: 'Post not found' };
        }

        if (data.repost.isRepost === true) {
            const reposted = await Post.findOne(
                {
                    'contentId.userId': contentId.userId,
                    'contentId.permlink': contentId.permlink,
                    'repost.isRepost': false,
                },
                { _id: false, 'content.title': true },
                { lean: true }
            );

            data.content.title = reposted.content.title;
        }

        return {
            contentId,
            title: data.content.title,
        };
    }

    async _getCommentData(contentId) {
        const data = await Comment.findOne(
            { 'contentId.userId': contentId.userId, 'contentId.permlink': contentId.permlink },
            { _id: false, 'content.body.preview': true, 'parent.post': true },
            { lean: true }
        );

        if (!data) {
            throw { code: 404, message: 'Comment not found' };
        }

        const parent = data.parent || { post: null };

        return {
            contentId,
            body: data.content.body.preview,
            parentPost: parent.post,
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
