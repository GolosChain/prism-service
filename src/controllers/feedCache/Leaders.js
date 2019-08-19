const LeaderModel = require('../../models/Leader');
const Abstract = require('./Abstract');

class Leaders extends Abstract {
    async getFor(communityId) {
        const { query, projection, options } = this._getDefaultRequestOptions(communityId);

        options.sort = { rating: -1 };

        const modelObjects = await LeaderModel.find(query, projection, options);

        return this._makeResult(modelObjects);
    }
}

module.exports = Leaders;
