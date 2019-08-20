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
        const path = `chargersRaw.${chargeType}`;
        const previousModel = await ProfileModel.findOneAndUpdate(
            {
                userId,
            },
            {
                $set: { [path]: { value: chargePercent, lastUpdated: Date.now() } },
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
            const value = data[key];

            switch (key) {
                case 'profile_image':
                case 'user_image':
                    query['personal.cyber.avatarUrl'] = value;
                    query['personal.gls.avatarUrl'] = value;
                    break;

                case 'background_image':
                case 'cover_image':
                    query['personal.cyber.coverUrl'] = value;
                    query['personal.gls.coverUrl'] = value;
                    break;

                case 'about':
                    query['personal.cyber.biography'] = value;
                    query['personal.gls.about'] = value;
                    break;

                case 'vk':
                    query['personal.cyber.contacts.vkontakte'] = value;
                    query['personal.gls.contacts.vkontakte'] = value;
                    break;

                case 'facebook':
                    query['personal.cyber.contacts.facebook'] = value;
                    query['personal.gls.contacts.facebook'] = value;
                    break;

                case 'instagram':
                    query['personal.cyber.contacts.instagram'] = value;
                    query['personal.gls.contacts.instagram'] = value;
                    break;

                case 'telegram':
                    query['personal.cyber.contacts.telegram'] = value;
                    query['personal.gls.contacts.telegram'] = value;
                    break;

                case 'whatsapp':
                    query['personal.cyber.contacts.whatsApp'] = value;
                    query['personal.gls.contacts.whatsApp'] = value;
                    break;

                case 'wechat':
                    query['personal.cyber.contacts.weChat'] = value;
                    query['personal.gls.contacts.weChat'] = value;
                    break;

                case 'name':
                    query['personal.gls.name'] = value;
                    break;

                case 'gender':
                    query['personal.gls.gender'] = value;
                    break;

                case 'email':
                    query['personal.gls.email'] = value;
                    break;

                case 'location':
                    query['personal.gls.location'] = value;
                    break;

                case 'website':
                    query['personal.gls.website'] = value;
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

    async handleVestingOpening({ owner, symbol }) {
        if (symbol !== '6,GOLOS') {
            return;
        }

        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId: owner },
            { $set: { isGolosVestingOpened: true } }
        );

        if (!previousModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProfileModel,
            documentId: previousModel._id,
            data: {
                $set: { isGolosVestingOpened: previousModel.isGolosVestingOpened },
            },
        });
    }
}

module.exports = Profile;
