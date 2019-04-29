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

        this._checkExists(modelObject);

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
        const modelObject = await Model.findOne(
            { [`usernames.${app}`]: username },
            { userId: true, usernames: true, personal: true },
            { lean: true }
        );

        this._checkExists(modelObject);

        const result = {
            userId: modelObject.userId,
        };

        modelObject.personal = modelObject.personal || {};
        modelObject.personal.gls = modelObject.personal.gls || {};
        modelObject.personal.cyber = modelObject.personal.cyber || {};

        switch (app) {
            case 'gls':
                result.profileImage = modelObject.personal.gls.profileImage || null;
                break;

            case 'cyber':
            default:
                result.avatarUrl = modelObject.personal.cyber.avatarUrl || null;
        }

        return result;
    }

    async getSubscriptions({ requestedUserId }) {
        const modelObject = await Model.findOne(
            { userId: requestedUserId },
            {
                _id: false,
                'subscriptions.userIds': true,
                'subscriptions.communityIds': true,
            },
            { lean: true }
        );

        this._checkExists(modelObject);

        return modelObject.subscriptions;
    }

    async getSubscribers({ requestedUserId }) {
        const modelObject = await Model.findOne(
            { userId: requestedUserId },
            {
                _id: false,
                'subscribers.userIds': true,
                'subscribers.communityIds': true,
            },
            { lean: true }
        );

        this._checkExists(modelObject);

        return modelObject.subscribers;
    }

    _checkExists(modelObject) {
        if (!modelObject) {
            throw { code: 404, message: 'Not found' };
        }
    }
}

module.exports = Profile;
