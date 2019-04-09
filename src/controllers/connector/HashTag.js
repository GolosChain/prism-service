const AbstractFeed = require('./AbstractFeed');
const HashTagModel = require('../../models/HashTag');

class HashTag extends AbstractFeed {
    async getTop({ communityId, limit, sequenceKey }) {
        const query = { communityId };
        const projection = { _id: false, name: true };
        const options = { sort: { count: -1 }, lean: true, limit, skip: 0 };

        if (sequenceKey) {
            options.skip = Number(this._unpackSequenceKey(sequenceKey));
        }

        const modelObjects = await HashTagModel.find(query, projection, options);

        if (!modelObjects) {
            return this._makeEmptyFeedResult();
        }

        return this._makeFeedResult(modelObjects, { limit }, { skip: options.skip });
    }

    _getSequenceKey(modelObjects, { limit }, { skip }) {
        const count = modelObjects.length;

        if (count < limit) {
            return null;
        }

        return this._packSequenceKey(skip + count);
    }
}

module.exports = HashTag;
