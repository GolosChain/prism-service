const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Model = require('../../models/Profile');

class Profile extends BasicController {
    async getProfile({ currentUserId, requestedUserId, type, username, app }) {
        if (!requestedUserId && !username) {
            throw { code: 400, message: 'Invalid user identification' };
        }

        // TODO Check user

        const modelObject = await Model.findOne(
            { userId: requestedUserId },
            {
                _id: false,
                __v: false,
                updatedAt: false,
                'subscriptions.userIds': false,
                'subscriptions.communityIds': false,
                'subscribers.userIds': false,
                'subscribers.communityIds': false,
            },
            { lean: true }
        );

        if (!modelObject) {
            throw { code: 404, message: 'Not found' };
        }

        modelObject.subscriptions = modelObject.subscriptions || {
            usersCount: 0,
            communitiesCount: 0,
        };
        modelObject.subscribers = modelObject.subscribers || {
            usersCount: 0,
            communitiesCount: 0,
        };
        modelObject.stats = modelObject.stats || { postsCount: 0, commentsCount: 0 };
        modelObject.registration = modelObject.registration || { time: new Date(0) };
        modelObject.personal = modelObject.personal || {};
        modelObject.personal = modelObject.personal[type] || {};

        await this._detectSubscription(modelObject, currentUserId, requestedUserId);

        return modelObject;
    }

    async _detectSubscription(modelObject, currentUserId, requestedUserId) {
        if (!currentUserId) {
            return;
        }

        const count = await Model.countDocuments({
            userId: currentUserId,
            'subscriptions.userIds': requestedUserId,
        });

        modelObject.isSubscribed = Boolean(count);
    }

    async resolveProfile({ username, app }) {
        // TODO -
    }

    async getSubscriptions({ userId }) {
        const modelObject = await Model.findOne(
            { userId },
            {
                _id: false,
                'subscriptions.userIds': true,
                'subscriptions.communityIds': true,
            },
            { lean: true }
        );

        if (!modelObject) {
            throw { code: 404, message: 'Not found' };
        }

        return modelObject.subscriptions;
    }

    async getSubscribers({ userId }) {
        const modelObject = await Model.findOne(
            { userId },
            {
                _id: false,
                'subscribers.userIds': true,
                'subscribers.communityIds': true,
            },
            { lean: true }
        );

        if (!modelObject) {
            throw { code: 404, message: 'Not found' };
        }

        return modelObject.subscribers;
    }
}

module.exports = Profile;
