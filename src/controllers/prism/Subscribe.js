const Abstract = require('./Abstract');
const ProfileModel = require('../../models/Profile');

class Subscribe extends Abstract {
    async pin({ args: { userId, target } }) {
        const field = await this._getTargetField(target);

        await ProfileModel.update({ userId }, { $addToSet: { [field]: target } });
    }

    async unpin({ args: { userId, target } }) {
        const field = await this._getTargetField(target);

        await ProfileModel.update({ userId }, { $pull: { [field]: target } });
    }

    async _getTargetField(target) {
        if (await this._isCommunity(target)) {
            return 'subscriptions.communityIds';
        } else {
            return 'subscriptions.userIds';
        }
    }

    async _isCommunity(id) {
        // TODO After blockchain implementation
    }
}

module.exports = Subscribe;
