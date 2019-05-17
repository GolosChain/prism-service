const AbstractFeed = require('./AbstractFeed');
const Model = require('../../models/Profile');

class Profile extends AbstractFeed {
    async getProfile({ currentUserId, requestedUserId, type, username, app }) {
        if (!requestedUserId && !username) {
            throw { code: 400, message: 'Invalid user identification' };
        }

        let query;

        if (requestedUserId) {
            query = { userId: requestedUserId };
        } else {
            query = { [`usernames.${app}`]: username };
        }

        const modelObject = await Model.findOne(
            query,
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
        modelObject.stats = modelObject.stats || { reputation: 0, postsCount: 0, commentsCount: 0 };
        modelObject.registration = modelObject.registration || { time: new Date(0) };
        modelObject.personal = (modelObject.personal || {})[type] || {};
        modelObject.usernames = modelObject.usernames || {};
        modelObject.username =
            modelObject.usernames[app] || modelObject.usernames['gls'] || requestedUserId;
        delete modelObject.usernames;

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
        modelObject.usernames = modelObject.usernames || {};

        result.username =
            modelObject.usernames[app] || modelObject.usernames['gls'] || result.userId;
        delete modelObject.usernames;

        switch (app) {
            case 'gls':
                result.avatarUrl = modelObject.personal.gls.avatarUrl || null;
                break;

            case 'cyber':
            default:
                result.avatarUrl = modelObject.personal.cyber.avatarUrl || null;
        }

        return result;
    }

    async getSubscriptions({ requestedUserId, limit, sequenceKey, type, app }) {
        return await this._getSubscribes({
            requestedUserId,
            limit,
            sequenceKey,
            type,
            field: 'subscriptions',
            app,
        });
    }

    async getSubscribers({ requestedUserId, limit, sequenceKey, type, app }) {
        return await this._getSubscribes({
            requestedUserId,
            limit,
            sequenceKey,
            type,
            field: 'subscribers',
            app,
        });
    }

    async _getSubscribes({ requestedUserId, limit, sequenceKey, type, field, app }) {
        const query = { userId: requestedUserId };
        const projection = { _id: false };
        const options = { lean: true };
        const targetType = this._getSubscribesTargetType(type);
        const targetPath = `${field}.${targetType}`;
        let skip = 0;

        if (sequenceKey) {
            skip = Number(this._unpackSequenceKey(sequenceKey));

            if (Number.isNaN(skip)) {
                throw { code: 400, message: 'Invalid sequenceKey' };
            }

            projection[targetPath] = { $slice: [skip, limit] };
        } else {
            projection[targetPath] = { $slice: [0, limit] };
        }

        const modelObject = await Model.findOne(query, projection, options);

        this._checkExists(modelObject);

        const items = modelObject[field][targetType];

        await this._populateSubscribes(items, app);

        return this._makeSubscribesResult(items, skip, limit);
    }

    _getSubscribesTargetType(type) {
        switch (type) {
            case 'community':
                return 'communityIds';
            case 'user':
            default:
                return 'userIds';
        }
    }

    _makeSubscribesResult(items, skip, limit) {
        if (!items || !items.length) {
            return {
                items: [],
                sequenceKey: null,
            };
        }

        if (items.length < limit) {
            return {
                items,
                sequenceKey: null,
            };
        }

        return {
            items,
            sequenceKey: this._packSequenceKey(skip + limit),
        };
    }

    _checkExists(modelObject) {
        if (!modelObject) {
            throw { code: 404, message: 'Not found' };
        }
    }

    async _populateSubscribes(userIds, app) {
        for (let i = 0; i < userIds.length; i++) {
            userIds[i] = await this._getSubscribeUserData(userIds[i], app);
        }
    }

    async _getSubscribeUserData(userId, app) {
        const model = await Model.findOne({ userId }, { usernames: true, personal: true });

        if (!model) {
            return {
                userId,
                username: userId,
                avatarUrl: null,
            };
        }

        const names = model.usernames;
        const username = names[app] || names['gls'] || userId;
        const personal = model.personal[app] || model.personal[app];
        let avatarUrl = null;

        if (personal) {
            avatarUrl = personal.avatarUrl;
        }

        return {
            userId,
            username,
            avatarUrl,
        };
    }
}

module.exports = Profile;
