const core = require('gls-core-service');
const BasicController = core.controllers.Basic;

const Model = require('../../models/CommunitySettings');

class CommunitySettings extends BasicController {
    async getSettings({ communityId, contractTypes }) {
        const query = { communityId };

        if (contractTypes) {
            query.contractType = {
                $in: contractTypes,
            };
        }

        const items = await Model.find(
            query,
            { contractType: true, structureName: true, data: true },
            { lean: true }
        );

        const groupedByTypes = {};

        for (const { contractType, structureName, data } of items) {
            let structures = groupedByTypes[contractType];

            if (!structures) {
                structures = {};
                groupedByTypes[contractType] = structures;
            }

            structures[structureName] = data;
        }

        return {
            contractTypes: groupedByTypes,
        };
    }
}

module.exports = CommunitySettings;
