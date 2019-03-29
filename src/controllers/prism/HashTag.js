const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Content = core.utils.Content;
const env = require('../../data/env');
const AbstractContent = require('./AbstractContent');
const PostModel = require('../../models/Post');
const HashTagModel = require('../../models/HashTag');

class HashTag extends AbstractContent {
    constructor(...args) {
        super(...args);

        this._contentUtil = new Content({ maxHashTagSize: env.GLS_MAX_HASH_TAG_SIZE });
    }

    async handleCreate({ args: content }, { communityId }) {
        if (!(await this._isPost(content))) {
            return;
        }

        const model = await this._tryGetModel(content, { 'content.tags': true });

        if (!model) {
            return;
        }

        const newTags = this._extractTags(content);

        model.content.tags = newTags;
        await model.save();

        await this._incrementTagsScore(newTags, communityId);
    }

    async handleUpdate({ args: content }, { communityId }) {
        if (!(await this._isPost(content))) {
            return;
        }

        const model = await this._tryGetModel(content, { 'content.tags': true });

        if (!model) {
            return;
        }

        const newTags = this._extractTags(content);
        const recentTags = model.content.tags;

        model.content.tags = newTags;
        await model.save();

        await this._decrementTagsScore(recentTags, communityId);
        await this._incrementTagsScore(newTags, communityId);
    }

    async handleDelete({ args: content }, { communityId }) {
        if (!(await this._isPost(content))) {
            return;
        }

        const model = await this._tryGetModel(content, { 'content.tags': true });

        if (!model) {
            return;
        }

        const recentTags = model.content.tags;

        await this._decrementTagsScore(recentTags, communityId);
    }

    _extractTags(content) {
        const tagsFromMetadata = this._extractTagsFromMetadata(content);
        const tagsFromText = this._extractTagsFromText(content);

        return [...new Set([...tagsFromMetadata, ...tagsFromText])];
    }

    _extractTagsFromMetadata(content) {
        const metadata = this._extractMetadata(content);
        const rawTags = Array.from(metadata.tags || []);

        return rawTags.filter(
            tag => typeof tag === 'string' && tag.length <= env.GLS_MAX_HASH_TAG_SIZE
        );
    }

    _extractTagsFromText(content) {
        const text = this._extractBodyRaw(content);

        return this._contentUtil.extractHashTags(text);
    }

    async _tryGetModel(content, projection) {
        const contentId = this._extractContentId(content);
        const model = await PostModel.findOne({ contentId }, projection);

        if (!model) {
            Logger.warn(`Unknown post - ${JSON.stringify(contentId)}`);
        }

        return model;
    }

    async _incrementTagsScore(tags, communityId) {
        await this._changeTagsScore(tags, communityId, true);
    }

    async _decrementTagsScore(tags, communityId) {
        await this._changeTagsScore(tags, communityId, false);
    }

    async _changeTagsScore(tags, communityId, isIncrement) {
        for (const name of tags) {
            let countIncrement;

            if (isIncrement) {
                countIncrement = 1;
            } else {
                countIncrement = -1;
            }

            await HashTagModel.updateOne(
                { communityId, name },
                { $inc: { count: countIncrement } },
                { upsert: true }
            );
        }
    }
}

module.exports = HashTag;