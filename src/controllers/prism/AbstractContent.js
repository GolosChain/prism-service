const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');

class AbstractContent extends Abstract {
    _extractMetadata(content) {
        const raw = content.jsonmetadata;

        if (raw === '') {
            return {};
        }

        try {
            const result = JSON.parse(raw);

            if (result === null || typeof result !== 'object' || Array.isArray(result)) {
                Logger.log('Invalid content metadata.');
                return {};
            } else {
                return result;
            }
        } catch (error) {
            Logger.log('Invalid content metadata.');
            return {};
        }
    }
}

module.exports = AbstractContent;
