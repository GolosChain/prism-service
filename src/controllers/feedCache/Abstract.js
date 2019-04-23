const env = require('../../data/env');

class Abstract {
    _getDefaultRequestOptions(communityId) {
        const query = { communityId };
        const projection = { _id: true };
        const options = { limit: env.GLS_FEED_CACHE_MAX_ITEMS, lean: true };

        if (communityId === '~all') {
            delete query.communityId;
        }

        return { query, projection, options };
    }

    _makeResult(modelObjects) {
        if (modelObjects) {
            return modelObjects.map(model => model._id);
        } else {
            return [];
        }
    }
}

module.exports = Abstract;
