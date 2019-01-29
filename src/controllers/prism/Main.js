const core = require('gls-core-service');
const RevertTrace = require('../../models/RevertTrace');
// TODO -

class Main {
    constructor(sevices) {
        // TODO -
    }

    async disperse([block, blockNum]) {
        const tracer = new RevertTrace({ blockNum });

        await tracer.save();

        // TODO -
    }
}

module.exports = Main;
