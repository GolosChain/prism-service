const core = require('gls-core-service');
const Logger = core.utils.Logger;
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
        const modelsAlready = await ProfileModel.count({ userId });

        if (modelsAlready > 0) {
            Logger.warn(`Duplicate user creation - ${userId}`);
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

        await profile.save();
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
