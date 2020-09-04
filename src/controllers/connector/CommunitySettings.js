const core = require('cyberway-core-service');
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

        for (const { contractName, actionName, structureName, data } of items) {
            let actions = groupedByContracts[contractName];

            if (!actions) {
                actions = {};
                groupedByContracts[contractName] = actions;
            }

            if (structureName) {
                let structures = actions[actionName];

                if (!structures) {
                    structures = {};
                    actions[actionName] = structures;
                }

                structures[structureName] = data;
            } else {
                actions[actionName] = data;
            }
        }

        return {
            contracts: groupedByContracts,
        };
    }
}

module.exports = CommunitySettings;
