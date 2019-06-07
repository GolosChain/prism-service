const core = require('gls-core-service');
const BasicController = core.controllers.Basic;

class Abstract extends BasicController {
    constructor({ forkService }, ...args) {
        super(...args);

        this._forkService = forkService;
    }

    async registerForkChanges(changes) {
        await this._forkService.registerChanges(changes);
    }
}

module.exports = Abstract;
