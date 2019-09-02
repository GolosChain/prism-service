const core = require('gls-core-service');
const BasicController = core.controllers.Basic;

const Model = require('../../models/CommunitySettings');

class CommunitySettings extends BasicController {
    async getSettings({ communityId, contracts }) {
        const query = { communityId };

        if (contracts) {
            query.contractName = {
                $in: contracts,
            };
        }

        const items = await Model.find(
            query,
            { contractName: true, actionName: true, structureName: true, data: true },
            { lean: true }
        );

        const groupedByContracts = {};

        for (const { contractName, structureName, actionName, data } of items) {
            let structures = groupedByContracts[contractName];

            if (!structures) {
                structures = {};
                groupedByContracts[contractName] = structures;
            }

            let struct = structures[structureName];

            if (!struct) {
                struct = {};
                structures[structureName] = struct;
            }

            struct[actionName] = data;
        }

        return {
            contracts: groupedByContracts,
        };
    }
}

module.exports = CommunitySettings;
