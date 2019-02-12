const Abstract = require('./Abstract');

class AbstractContent extends Abstract {
    _extractMetadata(content) {
        const raw = content.jsonmetadata;
        let result;

        try {
            result = JSON.parse(raw);

            if (typeof result !== 'object' || Array.isArray(result)) {
                Logger.log('Invalid content metadata.');
                result = {};
            }
        } catch (error) {
            Logger.log('Invalid content metadata.');
            result = {};
        }

        return result;
    }
}

module.exports = AbstractContent;
