const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');
const ProfileModel = require('../../models/Profile');

class Profile extends Abstract {
    async handleUsername({ owner: userId, name: username, creator: communityId }) {
        const path = `usernames.${communityId}`;
        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId },
            {
                $set: {
                    [path]: username,
                },
            }
        );

        if (!previousModel) {
            return;
        }

        const previousName = previousModel[path];
        let revertData;

        if (previousName) {
            revertData = {
                $set: {
                    [path]: previousName,
                },
            };
        } else {
            revertData = {
                $unset: {
                    [path]: true,
                },
            };
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProfileModel,
            documentId: previousModel._id,
            data: revertData,
        });
    }

    async handleCreate({ name: userId }, { blockTime }) {
        const modelsAlready = await ProfileModel.count({ userId });

        if (modelsAlready > 0) {
            Logger.warn(`Duplicate user creation - ${userId}`);
            return;
        }

        const model = await ProfileModel.create({
            userId,
            registration: {
                time: blockTime,
            },
        });

        await this.registerForkChanges({
            type: 'create',
            Model: ProfileModel,
            documentId: model._id,
        });
    }

    async handleMeta({ account: userId, meta }) {
        const profile = await ProfileModel.findOne({ userId }, { personal: true });

        if (!profile) {
            return;
        }

        const updateFields = this._omitNulls(meta);

        if (updateFields.profile_image !== undefined) {
            updateFields.avatarUrl = updateFields.profile_image;
        }

        if (updateFields.cover_image !== undefined) {
            updateFields.coverUrl = updateFields.cover_image;
        }

        profile.personal.gls = {
            ...profile.personal.gls,
            ...updateFields,
        };

        const personal = profile.personal.cyber;
        const contacts = personal.contacts;
        const or = this._currentOrNew.bind(this);

        personal.avatarUrl = or(personal.avatarUrl, meta.profile_image);
        personal.coverUrl = or(personal.coverUrl, meta.cover_image);
        personal.biography = or(personal.biography, meta.about);
        contacts.facebook = or(contacts.facebook, meta.facebook);
        contacts.telegram = or(contacts.telegram, meta.telegram);
        contacts.whatsApp = or(contacts.whatsApp, '');
        contacts.weChat = or(contacts.weChat, '');

        // TODO Fork log
        await profile.save();
    }

    async handleChargeState(chargeStateEvents) {
        chargeStateEvents = chargeStateEvents.filter(event => event.event === 'chargestate');
        for (const chargeStateEvent of chargeStateEvents) {
            const {
                user,
                charge_symbol: chargeSymbol,
                token_code: tokenCode,
                charge_id: chargeId,
                last_update: lastUpdate,
                value,
            } = chargeStateEvent.args;
            // TODO: решить, как обрабатывать charge_symbol, token_code, last_update

            let chargeType;

            switch (chargeId) {
                case 0:
                    chargeType = 'posts';
                    break;
                case 1:
                    chargeType = 'comments';
                    break;
                case 2:
                    chargeType = 'votes';
                    break;
                case 3:
                    chargeType = 'postbw';
                    break;
                default:
                    return;
            }

            const chargePercent = (10000 - value) / 100;

            await this._updateChargeState(chargeType, chargePercent);
        }
    }

    async _updateChargeState(chargeType, chargePercent) {
        const path = `chargers.${chargeType}`;
        const previousModel = await ProfileModel.findOneAndUpdate(
            {
                userId: user,
            },
            {
                $set: { [path]: chargePercent },
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
                $set: { [path]: previousModel[path] },
            },
        });
    }

    _currentOrNew(currentValue, newValue) {
        if (newValue === null || newValue === undefined) {
            return currentValue;
        } else {
            return newValue;
        }
    }

    _omitNulls(data) {
        const newData = {};

        for (const key of Object.keys(data)) {
            const value = data[key];

            if (value === null || value === undefined) {
                continue;
            }

            if (value === '') {
                newData[key] = null;
            } else {
                newData[key] = value;
            }
        }

        return newData;
    }
}

module.exports = Profile;
