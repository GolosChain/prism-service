const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Model = require('../../models/Profile');

class Profile extends BasicController {
    async getProfile({ requestedUserId }) {
        requestedUserId = String(requestedUserId);

        const modelObject = await Model.findOne(
            { userId: requestedUserId },
            { _id: false, __v: false, createdAt: false, updatedAt: false },
            { lean: true }
        );

        if (!modelObject) {
            throw { code: 404, message: 'Not found' };
        }

        await this._populateSubscriptions(modelObject.subscriptions);

        return modelObject;
    }

    async _populateSubscriptions(subscriptions) {
        subscriptions.communities = [];

        for (const id of subscriptions.communityIds) {
            // TODO Change after MVP
            subscriptions.communities.push({
                id,
                name: 'GOLOS',
                avatarUrl: 'none', // TODO Set before MVP
            });
        }

        delete subscriptions.communityIds;
    }
}

module.exports = Profile;
