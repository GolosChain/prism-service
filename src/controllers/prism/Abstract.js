const core = require('gls-core-service');
const BasicController = core.controllers.Basic;

class Abstract extends BasicController {
    constructor({ forkService, ...args } = {}) {
        super(args);

        this._forkService = forkService;
    }

    async registerForkChanges(changes) {
        if (this._forkService) {
            await this._forkService.registerChanges(changes);
        }
    }

    _getArrayEntityCommands(action) {
        switch (action) {
            case 'add':
                return ['$addToSet', '$pull', 1];
            case 'remove':
                return ['$pull', '$addToSet', -1];
        }
    }
}

module.exports = Abstract;
