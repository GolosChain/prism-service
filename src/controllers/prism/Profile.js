const Abstract = require('./Abstract');
const ProfileModel = require('../../models/Profile');

class Profile extends Abstract {
    async handleCreate({ name: userId }, { blockTime }) {
        if (await ProfileModel.findOne({ userId })) {
            return;
        }

        await ProfileModel.create({
            userId,
            username: userId, // TODO Change after MVP
            registration: {
                time: blockTime,
            },
            subscriptions: ['gls'], // TODO Change after MVP
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
        contacts.whatsApp = or(contacts.whatsApp, 'WAIT FOR BLOCKCHAIN');
        contacts.weChat = or(contacts.weChat, 'WAIT FOR BLOCKCHAIN');

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

            if (value !== null) {
                newData[key] = value;
            }
        }

        return newData;
    }
}

module.exports = Profile;
