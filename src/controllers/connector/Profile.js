const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Model = require('../../models/Profile');

class Profile extends BasicController {
    async getProfile({ id }) {
        id = String(id);

        const model = await Model.findOne(
            { id },
            { _id: false, __v: false, createdAt: false, updatedAt: false }
        );

        if (!model) {
            return { code: 404, message: 'Not found' };
        }

        return model.toObject();
    }
}

module.exports = Profile;
