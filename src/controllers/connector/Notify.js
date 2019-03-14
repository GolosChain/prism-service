const core = require('gls-core-service');
const BasicController = core.controllers.Basic;

class Notify extends BasicController {
    async getMeta({ userId, communityId, postId, commentId }) {
        const result = {};

        if (userId) {
            result.user = await this._getUserData();
        }

        if (communityId) {
            result.community = await this._getCommunityData();
        }

        if (postId) {
            result.post = await this._getPostData();
        }

        if (commentId) {
            result.comment = await this._getCommentData();
        }

        return result;
    }

    async _getUserData() {
        // TODO -
    }

    async _getCommunityData() {
        // TODO -
    }

    async _getPostData() {
        // TODO -
    }

    async _getCommentData() {
        // TODO -
    }
}

module.exports = Notify;
