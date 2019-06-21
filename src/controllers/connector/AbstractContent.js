const core = require('gls-core-service');
const Logger = core.utils.Logger;
const BasicController = core.controllers.Basic;
const BigNum = core.types.BigNum;
const ProfileModel = require('../../models/Profile');
const PostModel = require('../../models/Post');
const PoolModel = require('../../models/Pool');

class AbstractContent extends BasicController {
    async _getContent(
        Model,
        { currentUserId, requestedUserId, permlink, contentType, username, app }
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
                },
            },
            this._makeContentProjection(contentType),
            { lean: true }
        );

        if (!modelObject) {
            this._throwNotFound();
        }

        await this._applyPayouts([modelObject], modelObject.communityId);
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
            'votes.upVotes': false,
            'votes.downVotes': false,
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
        const upVoteCount = await Model.countDocuments({
            contentId,
            'votes.upVotes.userId': currentUserId,
        });
        const downVoteCount = await Model.countDocuments({
            contentId,
            'votes.downVotes.userId': currentUserId,
        });

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
            const user = { userId: id };
            await this._populateUser(user, app);
            modelObject.author = user;
        }
    }

    async _populateUserGeneric({
        modelObject,
        app,
        withSubscriptions = false,
        withSubscribers = false,
    }) {
        const projection = {
            _id: false,
            usernames: true,
            [`personal.${app}.avatarUrl`]: true,
        };

        if (withSubscribers) {
            projection.subscribers = true;
        }

        if (withSubscriptions) {
            projection.subscriptions = true;
        }

        const profile = await ProfileModel.findOne({ userId: modelObject.userId }, projection, {
            lean: true,
        });

        if (!profile) {
            Logger.warn(`populateUser - unknown user - ${modelObject.userId}`);
            modelObject.avatarUrl = null;
            modelObject.username = modelObject.userId;
            return;
        }

        profile.personal = profile.personal || {};
        profile.personal[app] = profile.personal[app] || {};
        profile.usernames = profile.usernames || {};

        modelObject.avatarUrl = profile.personal[app].avatarUrl || null;
        modelObject.username =
            profile.usernames[app] || profile.usernames['gls'] || modelObject.userId;

        if (withSubscribers) {
            modelObject.subscribers = profile.subscribers;
        }

        if (withSubscriptions) {
            modelObject.subscriptions = profile.subscriptions;
        }
    }

    async _populateUser(modelObject, app) {
        await this._populateUserGeneric({ modelObject, app });
    }

    async _populateUserWithSubscribers(modelObject, app) {
        await this._populateUserGeneric({ modelObject, app, withSubscribers: true });
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

    async _populateViewCount(modelObjects) {
        const modelsById = {};

        for (const model of modelObjects) {
            const { contentId } = model;
            const id = `${contentId.userId}/${contentId.permlink}`;

            modelsById[id] = model;
            model.stats.viewCount = 0;
        }

        try {
            const { results } = await this.callService('meta', 'getPostsViewCount', {
                postLinks: Object.keys(modelsById),
            });

            for (const { postLink, viewCount } of results) {
                modelsById[postLink].stats.viewCount = viewCount;
            }
        } catch (error) {
            Logger.warn('Cant connect to MetaService');

            for (const model of modelObjects) {
                model.stats.viewCount = 0;
            }
        }
    }

    async _populateReposts(modelObjects, projection) {
        await this._populateWithCache(modelObjects, this._populateRepost, projection);
    }

    async _populateRepost(modelObject, resolvedPosts, projection) {
        if (!modelObject.repost || !modelObject.repost.isRepost) {
            return;
        }

        const contentId = modelObject.contentId;
        const post = await this._getRepostPost(contentId, resolvedPosts, projection);

        if (!post) {
            return;
        }

        for (const key of Object.keys(modelObject)) {
            if (key !== 'repost') {
                modelObject[key] = post[key];
            }
        }
    }

    async _getRepostPost(contentId, resolvedPosts, projection) {
        let post;

        if (resolvedPosts.has(contentId)) {
            post = resolvedPosts.get(contentId);
        } else {
            post = await PostModel.findOne({ contentId }, projection, { lean: true });

            if (!post) {
                Logger.warn(`Repost - unknown post - ${JSON.stringify(contentId)}`);
                return null;
            }

            resolvedPosts.set(contentId, post);
        }

        return post;
    }

    async _applyPayouts(modelObjects, communityId) {
        const getPool = this._makePoolGetter();

        for (const modelObject of modelObjects) {
            if (modelObject.payout.done || !modelObject.payout.meta) {
                return;
            }

            const pool = await getPool(communityId);

            if (!pool) {
                continue;
            }

            this._applyPayout(modelObject, pool);
        }
    }

    _makePoolGetter() {
        const cache = new Map();

        return async communityId => {
            if (cache.has(communityId)) {
                return cache.get(communityId);
            }

            const pool = await PoolModel.findOne(
                { communityId },
                { funds: true, rShares: true, rSharesFn: true },
                { lean: true }
            );

            if (!pool) {
                Logger.warn(`Unknown Pool - ${communityId}`);
                return null;
            }

            cache.set(communityId, pool);

            return pool;
        };
    }

    _applyPayout(modelObject, pool) {
        const payoutMeta = modelObject.payout.meta;
        const totalPayout = this._calcTotalPayout({
            rewardWeight: payoutMeta.rewardWeight,
            funds: pool.funds.value,
            sharesFn: payoutMeta.sharesFn,
            rSharesFn: pool.rSharesFn,
        });
        const curationPayout = this._calcCuratorPayout({
            totalPayout,
            curatorsPercent: payoutMeta.curatorsPercent,
        });
        const benefactorPayout = this._calcBenefactorPayout({
            totalPayout,
            curationPayout,
            percents: payoutMeta.benefactorPercents,
        });
        const { tokens: authorTokenPayout, vesting: authorVestingPayout } = this._calcAuthorPayout({
            totalPayout,
            curationPayout,
            benefactorPayout,
            tokenProp: payoutMeta.tokenProp,
        });

        const payout = modelObject.payout;
        const name = pool.funds.name;

        payout.author.token.name = name;
        payout.author.token.value = Number(authorTokenPayout) || 0;
        payout.author.vesting.name = name;
        payout.author.vesting.value = Number(authorVestingPayout) || 0;
        payout.curator.vesting.name = name;
        payout.curator.vesting.value = Number(curationPayout) || 0;
        payout.benefactor.vesting.name = name;
        payout.benefactor.vesting.value = Number(benefactorPayout) || 0;
    }

    _calcTotalPayout({ rewardWeight, funds, sharesFn, rSharesFn }) {
        return new BigNum(rewardWeight)
            .times(funds)
            .times(new BigNum(sharesFn).div(rSharesFn))
            .div(10000);
    }

    _calcAuthorPayout({ totalPayout, curationPayout, benefactorPayout, tokenProp }) {
        const total = totalPayout.minus(curationPayout).minus(benefactorPayout);
        const tokens = total.times(new BigNum(tokenProp).div(10000));
        const vesting = total.minus(tokens);

        return { tokens, vesting };
    }

    _calcCuratorPayout({ totalPayout, curatorsPercent }) {
        return totalPayout.times(new BigNum(curatorsPercent).div(10000));
    }

    _calcBenefactorPayout({ totalPayout, curationPayout, percents }) {
        const payoutDiff = totalPayout.minus(curationPayout);
        let result = new BigNum(0);

        for (const percent of percents) {
            result = result.plus(payoutDiff.times(new BigNum(percent).div(10000)));
        }

        return result;
    }
}

module.exports = AbstractContent;
