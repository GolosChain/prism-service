const Abstract = require('./Abstract');
const ProfileModel = require('../../models/Profile');

class Profile extends Abstract {
    async handleCreate(
        {
            args: { name: userId },
        },
        { blockTime }
    ) {
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

    async handleMeta({ args: { account: userId, meta } }) {
        let profile = await ProfileModel.findOne({ userId });

        if (!profile) {
            return;
        }

        const personal = profile.personal;
        const contacts = personal.contacts;
        const or = this._currentOrNew.bind(this);

        // TODO Wait for blockchain...
        personal.avatarUrl = or(personal.avatarUrl, 'WAIT FOR BLOCKCHAIN');
        personal.coverUrl = or(personal.coverUrl, 'WAIT FOR BLOCKCHAIN');
        personal.biography = or(personal.biography, 'WAIT FOR BLOCKCHAIN');
        contacts.facebook = or(contacts.facebook, 'WAIT FOR BLOCKCHAIN');
        contacts.telegram = or(contacts.telegram, 'WAIT FOR BLOCKCHAIN');
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
}

module.exports = Profile;
