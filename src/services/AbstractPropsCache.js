const core = require('gls-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const stats = core.utils.statsClient;

class AbstractPropsCache extends BasicService {
    constructor(...args) {
        super(...args);

        this._currentValues = null;
    }

    async start(loopInterval) {
        this.startLoop(0, loopInterval);
    }

    async stop() {
        this.stopLoop();
    }

    async iteration() {
        try {
            this._currentValues = await this._extract();
        } catch (error) {
            Logger.error(`Can't update values for ${this.constructor.name} - ${error}`);
            stats.increment('extract_props_error');
        }
    }

    async getCurrentValues() {
        if (this._currentValues) {
            return this._currentValues;
        } else {
            await this.iteration();
            return await this.getCurrentValues();
        }
    }

    async _extract() {
        throw 'Not implemented';
    }
}

module.exports = AbstractPropsCache;
