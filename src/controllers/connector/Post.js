const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Model = require('../../models/Post');

class Post extends BasicController {
    async getPost({ postId, userId = null }) {
        postId = String(postId);
        userId = String(userId);

        const model = await Model.findOne(
            { id: postId },
            {
                'content.body.preview': false,
                _id: false,
                __v: false,
                createdAt: false,
                updatedAt: false,
            }
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

        delete result.votes.upUserIdList;
        delete result.votes.downUserIdList;

        return result;
    }
}

module.exports = Post;
