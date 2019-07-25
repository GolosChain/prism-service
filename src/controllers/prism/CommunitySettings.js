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
                const prevData = current.data;
                current.data = data;
                await current.save();

                await this._forkService.registerChanges({
                    type: 'update',
                    Model: CommunitySettingsModel,
                    documentId: current._id,
                    data: { $set: { data: prevData } },
                });
            } else {
                const newObject = await CommunitySettingsModel.create({
                    communityId,
                    contractName,
                    structureName,
                    data,
                });

                await this._forkService.registerChanges({
                    type: 'create',
                    Model: CommunitySettingsModel,
                    documentId: newObject._id,
                });
            }
        }
    }
}

module.exports = CommunitySettings;
