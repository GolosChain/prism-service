const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const ProfileModel = require('../../models/Profile');

class Subscribe extends BasicController {
    async pin({ pinner, pinning }) {
        const [arrayPath, countPath] = await this._getTargetFields(pinning);
        const pinnerModel = await this._getSubscriptionsProfile(pinner);
        const pinningModel = await this._getSubscribersProfile(pinning);

        if (pinnerModel) {
            const data = pinnerModel.subscriptions;

            data[arrayPath].push(pinning);
            data[countPath] = data[arrayPath].length;

            // TODO Fork log
            await pinnerModel.save();
        }

        if (pinningModel) {
            const data = pinningModel.subscribers;

            data[arrayPath].push(pinner);
            data[countPath] = data[arrayPath].length;

            // TODO Fork log
            await pinningModel.save();
        }
    }

    async unpin({ pinner, pinning }) {
        const [arrayPath, countPath] = await this._getTargetFields(pinning);
        const pinnerModel = await this._getSubscriptionsProfile(pinner);
        const pinningModel = await this._getSubscribersProfile(pinning);

        if (pinnerModel) {
            const data = pinnerModel.subscriptions;
            const subscriptions = data[arrayPath];
            const index = subscriptions.indexOf(pinner);

            if (index !== -1) {
                subscriptions.splice(index, 1);
                data[arrayPath] = subscriptions;
                data[countPath] = data[arrayPath].length;
                pinnerModel.markModified(`subscriptions.${arrayPath}`);
                // TODO Fork log
                await pinnerModel.save();
            }
        }

        if (pinningModel) {
            const data = pinningModel.subscribers;
            const subscribers = data[arrayPath];
            const index = subscribers.indexOf(pinning);

            if (index !== -1) {
                subscribers.splice(index, 1);
                data[arrayPath] = subscribers;
                data[countPath] = data[arrayPath].length;
                pinningModel.markModified(`subscribers.${arrayPath}`);
                // TODO Fork log
                await pinningModel.save();
            }
        }
    }

    async _getSubscriptionsProfile(userId) {
        return await this._getProfile(userId, { subscriptions: true });
    }

    async _getSubscribersProfile(userId) {
        return await this._getProfile(userId, { subscribers: true });
    }

    async _getProfile(userId, projection) {
        return await ProfileModel.findOne({ userId }, projection);
    }

    async _getTargetFields(target) {
        if (await this._isCommunity(target)) {
            return ['communityIds', 'communitiesCount'];
        } else {
            return ['userIds', 'usersCount'];
        }
    }

    async _isCommunity(id) {
        // TODO After blockchain implementation
        return false;
    }
}

module.exports = Subscribe;
