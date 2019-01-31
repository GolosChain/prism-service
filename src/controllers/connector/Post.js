const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Model = require('../../models/Post');

class Post extends BasicController {
    async getPost({ postId, userID: userId = null }) {
        postId = String(postId);
        userId = String(userId);

        const model = await Model.findOne(
            { postId },
            { _id: false, versionKey: false, 'content.body.preview': false }
        );

        if (!model) {
            return { code: 404, message: 'Not found' };
        }

        const result = model.toObject();
        const votes = result.votes;

        if (userId) {
            votes.upByUser = votes.upUserIdList.includes(userId);
            votes.downByUser = votes.downUserIdList.includes(userId);
        } else {
            votes.upByUser = false;
            votes.downByUser = false;
        }

        delete result.votes.upUserList;
        delete result.votes.downUserList;

        return result;
    }
}

module.exports = Post;
