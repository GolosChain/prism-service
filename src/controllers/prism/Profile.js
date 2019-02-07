const Abstract = require('./Abstract');
const ProfileModel = require('../../models/Profile');

// TODO Post count
// TODO Subscriptions
// TODO Add revert
class Profile extends Abstract {
    async handleCreation({ args: { name: id } }) {
        let profile = await ProfileModel.findOne({ id });

        if (profile) {
            return;
        }

        // TODO Time from block time
        profile = new ProfileModel({ id, registration: { time: new Date() } });

        await profile.save();
    }

    async handleMeta({ args: { account: id, meta } }) {
        let profile = await ProfileModel.findOne({ id });

        if (!profile) {
            return;
        }

        profile.personalization = profile.personalization || {};
        profile.messenger = profile.messenger || {};

        const person = profile.personalization || {};
        const mess = profile.messenger;

        person.avatarUrl = this._currentOrNew(person.avatarUrl, meta.avatar_url);
        person.coverUrl = this._currentOrNew(person.coverUrl, meta.cover_image);
        person.biography = this._currentOrNew(person.biography, meta.biography);
        mess.telegram = this._currentOrNew(mess.telegram, meta.telegram);
        mess.whatsApp = this._currentOrNew(mess.whatsApp, meta.whats_app);
        mess.weChat = this._currentOrNew(mess.weChat, meta.we_chat);
        mess.facebookMessenger = this._currentOrNew(
            mess.facebookMessenger,
            meta.facebook_messenger
        );

        // TODO Change when cyberway lib changed
        person.avatarUrl = this._currentOrNew(person.avatarUrl, meta.profile_image);
        person.coverUrl = this._currentOrNew(person.coverUrl, meta.cover_image);
        person.biography = this._currentOrNew(person.biography, meta.about);
        mess.telegram = this._currentOrNew(mess.telegram, meta.telegram);
        mess.whatsApp = this._currentOrNew(mess.whatsApp, 'none');
        mess.weChat = this._currentOrNew(mess.weChat, 'none');
        mess.facebookMessenger = this._currentOrNew(mess.facebookMessenger, meta.facebook);

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
