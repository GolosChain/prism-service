const Abstract = require('./Abstract');
const ProfileModel = require('../../models/Profile');

class Profile extends Abstract {
    async handleUsername({ owner: userId, name: username, creator: communityId }) {
        await ProfileModel.updateOne(
            { userId },
            {
                $set: {
                    [`usernames.${communityId}`]: username,
                },
            }
        );
    }

    async handleCreate({ name: userId }, { blockTime }) {
        if (await ProfileModel.findOne({ userId })) {
            return;
        }

        await ProfileModel.create({
            userId,
            registration: {
                time: blockTime,
            },
        });
    }

    async handleMeta({ account: userId, meta }) {
        const profile = await ProfileModel.findOne({ userId });

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

        await profile.save();
    }

    async handleChargeState({ user, charge_symbol, token_code, charge_id, last_update, value }) {
        // TODO: решить, как обрабатывать charge_symbol, token_code, last_update

        let chargeType;
        switch (charge_id) {
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

        await ProfileModel.updateOne(
            {
                userId: user,
            },
            { $set: { [`chargers.${chargeType}`]: chargePercent } }
        );
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
