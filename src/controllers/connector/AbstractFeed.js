const AbstractContent = require('./AbstractContent');

class AbstractFeed extends AbstractContent {
    _normalizeParams({ sortBy, sequenceKey, limit, raw }) {
        if (sequenceKey) {
            sequenceKey = this._unpackSequenceKey(sequenceKey);
        }

        return { sortBy, sequenceKey, limit, raw };
    }

    _packSequenceKey(sequenceKey) {
        return Buffer.from(String(sequenceKey)).toString('base64');
    }

    _unpackSequenceKey(sequenceKey) {
        return Buffer.from(String(sequenceKey), 'base64').toString();
    }

    _applySortingAndSequence({ query, projection, options }, { sortBy, sequenceKey, limit, raw }) {
        options.limit = limit;
        projection.__v = false;
        projection.updatedAt = false;
        projection['votes.upUserIds'] = false;
        projection['votes.downUserIds'] = false;
        projection['stats.wilson'] = false;

        if (raw) {
            projection['content.body.full'] = false;
            projection['content.body.preview'] = false;
        } else {
            projection['content.body.raw'] = false;
        }

        switch (sortBy) {
            case 'timeDesc':
                this._applySortByTime({ query, options, sequenceKey, direction: -1 });
                break;
            case 'time':
                this._applySortByTime({ query, options, sequenceKey, direction: 1 });
        }
    }

    _applySortByTime({ query, sequenceKey, direction }) {
        if (!sequenceKey) {
            return;
        }

        const keyDate = new Date(sequenceKey);

        if (isNaN(keyDate.valueOf())) {
            this._throwBadSequence();
        }

        if (direction > 0) {
            query.createdAt = { $gt: new Date(sequenceKey) };
        } else {
            query.createdAt = { $lt: new Date(sequenceKey) };
        }
    }

    _throwBadSequence() {
        throw { code: 400, message: 'Bad sequence params' };
    }

    _makeFeedResult(modelObjects, { sortBy, limit }, meta) {
        const sequenceKey = this._getSequenceKey(modelObjects, { sortBy, limit }, meta);

        for (const modelObject of modelObjects) {
            delete modelObject._id;
            delete modelObject.createdAt;
        }

        return {
            items: modelObjects,
            sequenceKey,
        };
    }

    _makeEmptyFeedResult() {
        return {
            items: [],
            sequenceKey: null,
        };
    }

    _getSequenceKey(modelObjects, { sortBy, limit }) {
        switch (sortBy) {
            case 'timeDesc':
            case 'time':
            default:
                return this._getSequenceKeyByTime(modelObjects, limit);
        }
    }

    _getSequenceKeyByTime(modelObjects, limit) {
        if (modelObjects.length < limit) {
            return null;
        }

        const time = modelObjects[modelObjects.length - 1].createdAt.toString();

        return this._packSequenceKey(time);
    }
}

module.exports = AbstractFeed;
