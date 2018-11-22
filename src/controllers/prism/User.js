const Abstract = require('./Abstract');
const Model = require('../../models/User');

class User extends Abstract {
    async handleAccount(data) {
        let metadata;

        try {
            metadata = JSON.parse(data.json_metadata);

            if (!metadata || Array.isArray(metadata)) {
                metadata = {};
            }
        } catch (error) {
            // invalid metadata or another client
            metadata = {};
        }

        const nameObject = { name: data.account };
        const model = await this._getOrCreateModelWithTrace(Model, nameObject, nameObject);

        model.name = data.account;

        this._applyProfile(model, metadata);

        await model.save();
    }

    _applyProfile(model, metadata) {
        const profile = metadata.profile;

        if (!profile) {
            // do nothing, no profile changes or another client
            return;
        }

        model.metaName = profile.name;
        model.profileImage = profile.profile_image;
        model.coverImage = profile.cover_image;
        model.about = profile.about;
        model.location = profile.location;
        model.website = profile.website;
        model.pinnedPosts = profile.pinnedPosts;
    }

    async handleCustom({ required_auths: auths, required_posting_auths: users, id: type, json }) {
        switch (type) {
            case 'follow':
                await this._tryApplyFollowers(users, json);
                break;
        }
    }

    async _tryApplyFollowers(users, json) {
        let metadata;

        try {
            metadata = JSON.parse(json);

            if (!metadata || !Array.isArray(metadata)) {
                return;
            }
        } catch (error) {
            // invalid metadata or another client
            return;
        }

        await this._applyFollowers(users, metadata);
    }

    async _applyFollowers(users, metadata) {
        for (let [target, following, followOn] of this._eachFollow(users, metadata)) {
            if (followOn) {
                await this._applyFollower(target, following);
            } else {
                await this._dropFollower(target, following);
            }
        }
    }

    *_eachFollow(users, metadata) {
        for (let i = 0, j = 1; i < users.length && j < metadata.length; i += 1, j += 2) {
            const user = users[i];
            const type = metadata[j - 1];
            const data = metadata[j];

            if (type !== 'follow') {
                continue;
            }

            if (typeof data !== 'object') {
                continue;
            }

            const target = data.follower;

            if (user !== target) {
                continue;
            }

            const actions = data.what;

            if (!actions || !Array.isArray(actions)) {
                continue;
            }

            const followOn = actions.includes('blog');
            const following = data.following;

            yield [target, following, followOn];
        }
    }

    async _applyFollower(target, following) {
        const targetUser = await this._getUserByNameWithTrace(target);

        if (targetUser) {
            await Model.updateOne({ _id: targetUser._id }, { $addToSet: { following } });
        }
    }

    async _dropFollower(target, following) {
        const targetUser = await this._getUserByNameWithTrace(target);

        if (targetUser) {
            await Model.updateOne({ _id: targetUser._id }, { $pull: { following } });
        }
    }

    async _getUserByNameWithTrace(name) {
        const user = await Model.findOne({ name });

        if (user) {
            await this._updateRevertTrace({
                command: 'swap',
                modelBody: user.toObject(),
                modelClassName: Model.modelName,
            });
        }

        return user;
    }
}

module.exports = User;
