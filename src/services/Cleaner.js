const core = require('gls-core-service');
const Logger = core.utils.Logger;
const stats = core.utils.statsClient;
const BasicService = core.services.Basic;
const env = require('../data/env');
const RevertTrace = require('../models/RevertTrace');

class Cleaner extends BasicService {
    async start() {
        const interval = env.GLS_REVERT_TRACE_CLEANER_INTERVAL;

        this.startLoop(interval, interval);
    }

    async stop() {
        this.stopLoop();
    }

    async iteration() {
        const timer = new Date();

        Logger.log('Start revert trace cleaning...');

        try {
            const currentLastBlock = await this._getCurrentLastBlock();

            if (currentLastBlock) {
                const edge = this._calcEdge(currentLastBlock);

                await this._clearOutdated(edge);
            }
        } catch (error) {
            Logger.error(`Cleaner error - ${error}`);
            stats.increment('logic_service_error');
            process.exit(1);
        }

        Logger.log('Revert trace cleaning done!');

        stats.timing('cleaner_work_time', new Date() - timer);
    }

    async _getCurrentLastBlock() {
        const latestDocument = await RevertTrace.findOne(
            {},
            { blockNum: 1 },
            {
                sort: {
                    _id: -1,
                },
            }
        );

        if (!latestDocument) {
            return null;
        }

        return latestDocument.blockNum;
    }

    _calcEdge(currentLastBlock) {
        return currentLastBlock - env.GLS_DELEGATION_ROUND_LENGTH * 3;
    }

    async _clearOutdated(edge) {
        await RevertTrace.deleteMany({ blockNum: { $lt: edge } });
    }
}

module.exports = Cleaner;
