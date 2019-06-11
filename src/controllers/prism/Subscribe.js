const ProfileModel = require('../../models/Profile');
const Abstract = require('./Abstract');

class Subscribe extends Abstract {
    async pin({ pinner, pinning }) {
        await this._manage(pinner, pinning, 'add');
    }

    async unpin({ pinner, pinning }) {
        await this._manage(pinner, pinning, 'remove');
    }

    async _manage(pinner, pinning, action) {
        const [addAction, removeAction, increment] = this._getArrayEntityCommands(action);
        const applier = this._makeSubscriptionApplier({ addAction, removeAction, increment });

        await applier(pinner, pinning, 'subscriptions');
        await applier(pinning, pinner, 'subscribers');
    }

    _makeSubscriptionApplier({ addAction, removeAction, increment }) {
        return async (iniciator, target, type) => {
            const [arrayPath, countPath] = await this._getTargetFields(iniciator);
            const fullArrayPath = `${type}.${arrayPath}`;
            const fullCountPath = `${type}.${countPath}`;
            const previousModel = await ProfileModel.findOneAndUpdate(
                {
                    userId: iniciator,
                },
                {
                    [addAction]: { [fullArrayPath]: target },
                    $inc: { [fullCountPath]: increment },
                }
            );

            if (!previousModel) {
                return;
            }

            await this.registerForkChanges({
                type: 'update',
                Model: ProfileModel,
                documentId: previousModel._id,
                data: {
                    [removeAction]: { [fullArrayPath]: target },
                    $inc: { [fullCountPath]: -increment },
                },
            });
        };
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
