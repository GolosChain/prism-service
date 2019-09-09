const escape = require('escape-string-regexp');

const AbstractFeed = require('./AbstractFeed');
const Model = require('../../models/Profile');

class Profile extends AbstractFeed {
    async getProfile({ currentUserId, requestedUserId, username, user, app }) {
        if (!requestedUserId && !username && !user) {
            throw { code: 400, message: 'Invalid user identification' };
        }

        let queries;

        if (user) {
            queries = [{ [`usernames.${app}`]: user }, { userId: user }];
        } else if (requestedUserId) {
            queries = [{ userId: requestedUserId }];
        } else {
            queries = [{ [`usernames.${app}`]: username }];
        }

        let modelObject;

        for (const query of queries) {
            modelObject = await Model.findOne(
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

            if (modelObject) {
                break;
            }
        }

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
        modelObject.personal = (modelObject.personal || {})[app] || {};
        modelObject.leaderIn = modelObject.leaderIn || [];
        modelObject.usernames = modelObject.usernames || {};
        modelObject.username = modelObject.usernames[app] || null;
        delete modelObject.usernames;

        modelObject.chargersRaw = modelObject.chargersRaw = {};
        modelObject.chargers = this._calculateChargers(modelObject.chargersRaw);
        delete modelObject.chargersRaw;

        await this._detectSubscription(modelObject, currentUserId, requestedUserId);

        if (app !== 'gls') {
            delete modelObject.isGolosVestingOpened;
        }

        return modelObject;
    }

    async getChargers({ userId }) {
        const profile = await Model.findOne(
            { userId },
            { chargersRaw: true, _id: false },
            { lean: true }
        );

        this._checkExists(profile);

        return this._calculateChargers(profile.chargersRaw || {});
    }

    _calculateChargers(chargers) {
        const chargerValues = {};

        for (const charger of Object.keys(chargers)) {
            // todo: wait for core team and add formula
            chargerValues[charger] = chargers[charger].value;
        }

        return chargerValues;
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
            { userId: true, usernames: true, personal: true, chargers: true },
            { lean: true }
        );

        this._checkExists(modelObject);

        const result = {
            userId: modelObject.userId,
        };

        modelObject.personal = modelObject.personal || {};
        modelObject.personal.gls = modelObject.personal.gls || {};
        modelObject.personal.cyber = modelObject.personal.cyber || {};
        result.username = (modelObject.usernames || {})[app] || null;
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

    async getSubscriptions({ currentUserId, requestedUserId, limit, sequenceKey, type, app }) {
        const markAllAsSubscribed = currentUserId === requestedUserId;

        return await this._getSubscribes({
            currentUserId,
            requestedUserId,
            limit,
            sequenceKey,
            type,
            field: 'subscriptions',
            app,
            markAllAsSubscribed,
        });
    }

    async getSubscribers({ currentUserId, requestedUserId, limit, sequenceKey, type, app }) {
        return await this._getSubscribes({
            currentUserId,
            requestedUserId,
            limit,
            sequenceKey,
            type,
            field: 'subscribers',
            app,
        });
    }

    async _getSubscribes({
        currentUserId,
        requestedUserId,
        limit,
        sequenceKey,
        type,
        field,
        app,
        markAllAsSubscribed = false,
    }) {
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
        await this._populateSelfSubscribed(items, currentUserId, markAllAsSubscribed);

        return this._makeArrayPaginationResult(items, skip, limit);
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

    _checkExists(modelObject) {
        if (!modelObject) {
            throw { code: 404, message: 'Not found' };
        }
    }

    async _populateSubscribes(userIds, app) {
        const result = [];

        for (let i = 0; i < userIds.length; i++) {
            result.push(
                (async () => {
                    userIds[i] = await this._getSubscribeUserData(userIds[i], app);
                })()
            );
        }

        await Promise.all(result);
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

        const username = model.usernames[app] || null;
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

    async _populateSelfSubscribed(items, currentUserId, markAllAsSubscribed) {
        for (const item of items) {
            if (!currentUserId) {
                item.isSubscribed = false;
                continue;
            }

            if (markAllAsSubscribed) {
                item.isSubscribed = true;
                continue;
            }

            const count = await Model.countDocuments({
                userId: currentUserId,
                'subscriptions.userIds': item.userId,
            });

            item.isSubscribed = Boolean(count);
        }
    }

    async suggestNames({ text, app }) {
        text = text.trim();

        if (text.length < 2 || text.includes('@')) {
            return [];
        }

        const results = await Model.find(
            {
                [`usernames.${app}`]: {
                    $regex: `^${escape(text.toLowerCase())}`,
                },
            },
            {
                userId: true,
                usernames: true,
            },
            {
                limit: 10,
            }
        );

        return results.map(item => ({
            userId: item.userId,
            username: item.usernames[app],
        }));
    }
}

module.exports = Profile;
