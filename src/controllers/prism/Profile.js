const lodash = require('lodash');
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
        const query = this._makePersonalUpdateQuery(meta);
        const previousModel = await ProfileModel.findOneAndUpdate(
            {
                userId,
            },
            {
                $set: query,
            }
        );

        if (!previousModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProfileModel,
            documentId: previousModel,
            data: {
                $set: this._extractPersonalReversedFields(query, previousModel),
            },
        });
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
                    chargeType = 'votes';
                    break;
                case 1:
                    chargeType = 'posts';
                    break;
                case 2:
                    chargeType = 'comments';
                    break;
                case 3:
                    chargeType = 'postbw';
                    break;
                default:
                    return;
            }

            const chargePercent = (10000 - value) / 100;

            await this._updateChargeState(user, chargeType, chargePercent);
        }
    }

    async _updateChargeState(userId, chargeType, chargePercent) {
        const path = `chargers.${chargeType}`;
        const previousModel = await ProfileModel.findOneAndUpdate(
            {
                userId,
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

    _makePersonalUpdateQuery(meta) {
        const data = this._extractUpdatedPersonalRawFields(meta);
        const query = {};

        for (const key of Object.keys(data)) {
            switch (key) {
                case 'profile_image':
                    query['personal.cyber.avatarUrl'] = data[key];
                    query['personal.gls.avatarUrl'] = data[key];
                    break;

                case 'background_image':
                case 'cover_image':
                    query['personal.cyber.coverUrl'] = data[key];
                    query['personal.gls.coverUrl'] = data[key];
                    break;

                case 'about':
                    query['personal.cyber.biography'] = data[key];
                    query['personal.gls.about'] = data[key];
                    break;

                case 'facebook':
                    query['personal.cyber.contacts.facebook'] = data[key];
                    break;

                case 'telegram':
                    query['personal.cyber.contacts.telegram'] = data[key];
                    break;

                case 'whatsapp':
                    query['personal.cyber.contacts.whatsApp'] = data[key];
                    break;

                case 'wechat':
                    query['personal.cyber.contacts.weChat'] = data[key];
                    break;

                case 'user_image':
                    query['personal.gls.name'] = data[key];
                    break;

                case 'gender':
                    query['personal.gls.gender'] = data[key];
                    break;

                case 'location':
                    query['personal.gls.location'] = data[key];
                    break;

                case 'website':
                    query['personal.gls.website'] = data[key];
                    break;
            }
        }

        return query;
    }

    _extractUpdatedPersonalRawFields(meta) {
        const result = {};

        for (const key of Object.keys(meta)) {
            const value = meta[key];

            if (value === null || value === undefined) {
                continue;
            }

            if (value === '') {
                result[key] = null;
            }

            result[key] = value;
        }

        return result;
    }

    _extractPersonalReversedFields(query, previousModel) {
        const result = {};

        for (const key of Object.keys(query)) {
            result[key] = lodash.get(previousModel, key) || null;
        }

        return result;
    }
}

module.exports = Profile;
