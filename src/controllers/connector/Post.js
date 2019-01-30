const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Model = require('../../models/Post');

class Post extends BasicController {
    async getPost({ id, user = null }) {
        // TODO User by id only
        id = String(id);

        const model = await Model.findOne(
            { id },
            { _id: false, versionKey: false, 'content.body.preview': false }
        );

        if (!model) {
            return { code: 404, message: 'Not found' };
        }

        const result = model.toObject();
        const votes = result.votes;

        if (user) {
            votes.upByUser = votes.upUserList.includes(user);
            votes.downByUser = votes.downUserList.includes(user);
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
