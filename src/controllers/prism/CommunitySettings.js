const core = require('gls-core-service');
const { Logger } = core.utils;
const CommunitySettingsModel = require('../../models/CommunitySettings');

class CommunitySettings {
    constructor({ forkService }) {
        this._forkService = forkService;
    }

    async handleSetParams(communityId, contractName, structures) {
        for (const [structureName, data] of structures) {
            const current = await CommunitySettingsModel.findOne({
                communityId,
                contractName,
                structureName,
            });

            if (current) {
                await this._updateExisted({ current, data });
            } else {
                await this._createNew({ communityId, contractName, structureName, data });
            }
        }
    }

    async _updateExisted({ current, data }) {
        const prevData = current.data;
        current.data = data;
        await current.save();

        await this._forkService.registerChanges({
            type: 'update',
            Model: CommunitySettingsModel,
            documentId: current._id,
            data: { $set: { data: prevData } },
        });
    }

    async _createNew(modelData) {
        const newObject = await CommunitySettingsModel.create(modelData);

        await this._forkService.registerChanges({
            type: 'create',
            Model: CommunitySettingsModel,
            documentId: newObject._id,
        });
    }
}

module.exports = CommunitySettings;
