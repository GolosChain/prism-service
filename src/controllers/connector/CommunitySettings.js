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
            { contractName: true, structureName: true, symbol: true, data: true },
            { lean: true }
        );

        const groupedByContracts = {};

        for (const { contractName, structureName, symbol, data } of items) {
            let structures = groupedByContracts[contractName];

            if (!structures) {
                structures = {};
                groupedByContracts[contractName] = structures;
            }

            if (contractName === 'vesting') {
                if (!structures[symbol]) {
                    structures[symbol] = {};
                }

                structures[symbol][structureName] = data;
            } else {
                structures[structureName] = data;
            }
        }

        return {
            contracts: groupedByContracts,
        };
    }
}

module.exports = CommunitySettings;
