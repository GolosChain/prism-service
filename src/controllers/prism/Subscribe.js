const Abstract = require('./Abstract');
const ProfileModel = require('../../models/Profile');

class Subscribe extends Abstract {
    async pin({ pinner, pinning }) {
        const [arrayPath, countPath] = await this._getTargetFields(pinning);
        const pinnerModel = await this._getSubscriptionsProfile(pinner);
        const pinningModel = await this._getSubscribersProfile(pinning);

        if (pinnerModel) {
            const data = pinnerModel.subscriptions;

            data[arrayPath].push(pinning);
            this._updateCount(data, countPath);
            await pinnerModel.save();
        }

        if (pinningModel) {
            const data = pinningModel.subscribers;

            data[arrayPath].push(pinner);
            this._updateCount(data, countPath);
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

            if (index) {
                subscriptions.splice(index, 1);
                data[arrayPath] = subscriptions;
                pinnerModel.markModified(`subscriptions.${arrayPath}`);
                this._updateCount(data, countPath);
                await pinnerModel.save();
            }
        }

        if (pinningModel) {
            const data = pinningModel.subscribers;
            const subscribers = data[arrayPath];
            const index = subscribers.indexOf(pinning);

            if (index) {
                subscribers.splice(index, 1);
                data[arrayPath] = subscribers;
                pinningModel.markModified(`subscribers.${arrayPath}`);
                this._updateCount(data, countPath);
                await pinningModel.save();
            }
        }
    }

    _updateCount(data, countPath) {
        data[countPath] = data[countPath] || 0;
        data[countPath]++;
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
