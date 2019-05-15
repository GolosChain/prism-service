const core = require('gls-core-service');
const Logger = core.utils.Logger;
const BasicController = core.controllers.Basic;
const ProfileModel = require('../../models/Profile');

class AbstractContent extends BasicController {
    async _getContent(
        Model,
        { currentUserId, requestedUserId, permlink, refBlockNum, contentType, username, app }
    ) {
        if (!requestedUserId && !username) {
            throw { code: 400, message: 'Invalid user identification' };
        }

        if (!requestedUserId) {
            requestedUserId = this._getUserIdByName(username, app);
        }

        const modelObject = await Model.findOne(
            {
                contentId: {
                    userId: requestedUserId,
                    permlink,
                    refBlockNum,
                },
            },
            this._makeContentProjection(contentType),
            { lean: true }
        );

        if (!modelObject) {
            this._throwNotFound();
        }

        await this._tryApplyVotes({ Model, modelObject, currentUserId });
        await this._populateAuthors([modelObject], app);

        return modelObject;
    }

    _makeContentProjection(contentType) {
        let excludeContentVariant;

        switch (contentType) {
            case 'web':
                excludeContentVariant = {
                    'content.body.mobile': false,
                    'content.body.raw': false,
                };
                break;
            case 'mobile':
                excludeContentVariant = {
                    'content.body.full': false,
                    'content.body.mobile._id': false,
                    'content.body.raw': false,
                };
                break;
            case 'raw':
                excludeContentVariant = {
                    'content.body.full': false,
                    'content.body.mobile': false,
                };
                break;
        }

        return {
            'content.body.preview': false,
            'votes.upUserIds': false,
            'votes.downUserIds': false,
            _id: false,
            __v: false,
            createdAt: false,
            updatedAt: false,
            ...excludeContentVariant,
        };
    }

    async _tryApplyVotesForModels({ Model, modelObjects, currentUserId }) {
        for (const modelObject of modelObjects) {
            await this._tryApplyVotes({ Model, modelObject, currentUserId });
        }
    }

    async _tryApplyVotes({ Model, modelObject, currentUserId }) {
        const votes = modelObject.votes;

        if (currentUserId) {
            const { hasUpVote, hasDownVote } = await this._detectVotes(
                Model,
                modelObject.contentId,
                currentUserId
            );

            votes.hasUpVote = hasUpVote;
            votes.hasDownVote = hasDownVote;
        } else {
            votes.hasUpVote = false;
            votes.hasDownVote = false;
        }
    }

    async _detectVotes(Model, contentId, currentUserId) {
        const upVoteCount = await Model.count({ contentId, 'votes.upUserIds': currentUserId });
        const downVoteCount = await Model.count({ contentId, 'votes.downUserIds': currentUserId });

        return { hasUpVote: Boolean(upVoteCount), hasDownVote: Boolean(downVoteCount) };
    }

    async _populateAuthors(modelObjects, app) {
        await this._populateWithCache(modelObjects, this._populateAuthor, app);
    }

    async _populateAuthor(modelObject, authors, app) {
        const id = modelObject.contentId.userId;

        if (authors.has(id)) {
            modelObject.author = authors.get(id);
        } else {
            const profile = await ProfileModel.findOne(
                { userId: id },
                {
                    username: true,
                    _id: false,
                    [`personal.${app}.avatarUrl`]: true,
                }
            );

            if (profile) {
                profile.usernames = profile.usernames || {};

                modelObject.author = {
                    userId: id,
                    username: profile.usernames[app] || id,
                    avatarUrl: profile.personal[app].avatarUrl || null,
                };
            } else {
                Logger.error(`Feed - unknown user - ${id}`);
                modelObject.author = { userId: id, username: id };
            }
        }
    }

    async _populateCommunities(modelObjects) {
        await this._populateWithCache(modelObjects, this._populateCommunity);
    }

    async _populateCommunity(modelObject, communities) {
        const id = modelObject.communityId;

        if (communities.has(id)) {
            modelObject.community = communities.get(id);
        } else {
            // TODO After MVP
            modelObject.community = {
                id: 'gls',
                name: 'GOLOS',
                avatarUrl: null, // TODO Set before MVP
            };

            communities.set(id, modelObject.community);
        }

        delete modelObject.communityId;
    }

    async _populateWithCache(modelObjects, method, ...args) {
        const cacheMap = new Map();

        for (const modelObject of modelObjects) {
            await method.call(this, modelObject, cacheMap, ...args);
        }
    }

    _removeEmptyParentsForAll(modelObjects) {
        for (const modelObject of modelObjects) {
            this._removeEmptyParents(modelObject);
        }
    }

    _removeEmptyParents(modelObject) {
        if (
            modelObject.parent &&
            modelObject.parent.comment &&
            !modelObject.parent.comment.contentId
        ) {
            delete modelObject.parent.comment;
        }
    }

    async _tryApplyUserIdByName(params) {
        if (!params.requestedUserId && params.username) {
            params.requestedUserId = this._getUserIdByName(params.username, params.app);
        }
    }

    async _getUserIdByName(username, app) {
        const profile = await ProfileModel.findOne(
            { [`usernames.${app}`]: username },
            { userId: true, _id: false },
            { lean: true }
        );

        if (!profile) {
            this._throwNotFound();
        }

        return profile.userId;
    }

    _throwNotFound() {
        throw { code: 404, message: 'Not found' };
    }
}

module.exports = AbstractContent;
