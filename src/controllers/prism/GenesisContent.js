const core = require('cyberway-core-service');
const { Logger, metrics, ParallelPool, BulkSaver } = core.utils;
const { NESTED_COMMENTS_MAX_INDEX_DEPTH } = require('../../data/constants');
const GenesisLimitedCache = require('../../utils/GenesisLimitedCache');
const SubscribesSaver = require('../../utils/SubscribesSaver');
const Payouts = require('../../utils/Payouts');
const WilsonScoring = require('../../utils/WilsonScoring');
const ProfileModel = require('../../models/Profile');
const LeaderModel = require('../../models/Leader');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const PostController = require('./Post');
const CommentController = require('./Comment');

class GenesisContent {
    constructor() {
        this._posts = new Map();
        this._commentsCache = new GenesisLimitedCache({ fetch: this._fetchCommentInfo.bind(this) });
        this._users = new Map();
        this._isEnd = false;

        this._postController = new PostController();
        this._commentController = new CommentController();

        this._profilesBulk = new BulkSaver(ProfileModel, 'profiles');
        this._postsBulk = new BulkSaver(PostModel, 'posts');
        this._commentsBulk = new BulkSaver(CommentModel, 'comments');
        this._leadersBulk = new BulkSaver(LeaderModel, 'leaders');
        this._subscribesSaver = new SubscribesSaver();
    }

    async handle(type, data) {
        if (this._isEnd) {
            throw new Error('Method finish has been called already');
        }

        metrics.inc('genesis_handle', { type });

        switch (type) {
            case 'account':
                this._handleAccount(data);
                return true;
            case 'message':
                await this._handleMessage(data);
                return true;
            case 'pin':
                await this._handlePin(data);
                return true;
            case 'witnessstate':
                await this._handleWitnessState(data);
                return true;
            default:
                // Do nothing
                return false;
        }
    }

    async finish() {
        this._isEnd = true;
    }

    async typeEnd(type) {
        switch (type) {
            case 'account':
                await this._profilesBulk.finish();
                break;
            case 'message':
                await this._finishMessages();
                break;
            case 'pin':
                await this._subscribesSaver.finish();
                break;
            case 'witnessstate':
                await this._leadersBulk.finish();
                break;
            default:
            // Do nothing
        }
    }

    _handleAccount(data) {
        const { owner: userId, name, created, reputation, json_metadata } = data;

        let metadata = {};

        if (json_metadata && json_metadata !== "{created_at: 'GENESIS'}") {
            try {
                const { profile } = JSON.parse(json_metadata);

                if (profile) {
                    metadata = {
                        name: profile.name,
                        gender: profile.gender,
                        email: profile.email,
                        about: profile.about,
                        location: profile.location,
                        website: profile.website,
                        avatarUrl: profile.profile_image,
                        coverUrl: profile.cover_image,
                        contacts: profile.social,
                    };
                }
            } catch (err) {
                Logger.error('Profile with invalid json_metadata:', err);
            }
        }

        let registrationTime = null;

        if (created !== '1970-01-01T00:00:00.000') {
            registrationTime = new Date(created + 'Z');
        }

        this._profilesBulk.addEntry({
            userId,
            usernames: { gls: name },
            isGenesisUser: true,
            isGolosVestingOpened: true,
            registration: {
                time: registrationTime,
            },
            stats: {
                reputation,
            },
            personal: { gls: metadata },
        });

        metrics.inc('genesis_type_account_processed');
    }

    async _handleMessage(data) {
        const {
            author: userId,
            permlink,
            title,
            body,
            tags,
            votes,
            parent_author: parentAuthor,
            parent_permlink: parentPermlink,
            created,
            archived,
            author_reward,
            benefactor_reward,
            curator_reward,
            reblogs,
            net_rshares: rShares,
        } = data;

        const meta = {
            time: new Date(created + 'Z'),
        };

        const contentId = {
            userId,
            permlink,
        };
        const contentIdString = `${contentId.userId}/${contentId.permlink}`;

        const parentContentId = {
            userId: parentAuthor,
            permlink: parentPermlink,
        };
        const parentContentIdString = `${parentContentId.userId}/${parentContentId.permlink}`;

        const payouts = {
            author_reward,
            benefactor_reward,
            curator_reward,
        };

        if (parentAuthor) {
            await this._processComment({
                contentId,
                contentIdString,
                parentContentId,
                parentContentIdString,
                title,
                body,
                votes,
                meta,
                archived,
                payouts,
            });
        } else {
            this._processPost({
                contentId,
                contentIdString,
                title,
                body,
                tags,
                votes,
                meta,
                archived,
                payouts,
                reblogs,
                rShares,
            });
        }
    }

    _processPost({
        contentId,
        contentIdString,
        title,
        body,
        tags,
        votes,
        meta,
        archived,
        payouts,
        reblogs,
        rShares,
    }) {
        const postModel = new PostModel({
            communityId: 'gls',
            contentId,
            content: this._postController.extractContentObjectFromGenesis({ title, body }),
            tags,
            meta,
        }).toObject();

        const postInfo = {
            contentId,
            currentCommentOrderingId: 0,
            commentsCount: 0,
        };

        this._posts.set(contentIdString, postInfo);
        this._incUserPostsCounter(contentId.userId);
        this._applyVotes(postModel, votes);
        this._applyPayouts(postModel, { archived, payouts });
        this._addPayoutScoring(postModel, { netshares: rShares });
        this._processReblogs({ contentId, reblogs });
        this._postsBulk.addEntry(postModel);
        metrics.inc('genesis_type_posts_processed');
    }

    async _processComment({
        contentId,
        contentIdString,
        parentContentId,
        parentContentIdString,
        title,
        body,
        votes,
        meta,
        archived,
        payouts,
    }) {
        const commentModel = new CommentModel({
            communityId: 'gls',
            contentId,
            content: this._commentController.extractContentObjectFromGenesis({ title, body }),
            meta,
        }).toObject();

        const commentInfo = {
            post: null,
            contentId,
            nestedLevel: null,
            orderByTime: null,
        };

        this._applyVotes(commentModel, votes);
        this._applyPayouts(commentModel, { archived, payouts });
        await this._setCommentParent(commentInfo, commentModel, parentContentIdString);
        this._commentsCache.add(contentIdString, commentInfo);
        this._incUserCommentsCounter(contentId.userId);
        this._commentsBulk.addEntry(commentModel);
        metrics.inc('genesis_type_comments_processed');
    }

    _processReblogs({ contentId, reblogs }) {
        for (const reblog of reblogs) {
            const postModel = new PostModel({
                communityId: 'gls',
                contentId,
                repost: {
                    isRepost: true,
                    userId: reblog.account,
                    time: reblog.time,
                },
            }).toObject();

            if (reblog.body !== '') {
                postModel.repost.body = {};
                postModel.repost.body.raw = reblog.body;
            }

            this._postsBulk.addEntry(postModel);
        }
    }

    async _setCommentParent(commentInfo, commentModel, parentContentIdString) {
        const post = this._posts.get(parentContentIdString);

        if (post) {
            this._setParentByPost(commentInfo, commentModel, post);
            return;
        }

        const parentComment = await this._commentsCache.get(parentContentIdString);

        if (!parentComment) {
            Logger.error('No parent post/comment in cache:', {
                current: commentInfo.contentId,
                parent: parentContentIdString,
            });
            metrics.inc('genesis_message_no_parent');
            return;
        }

        this._setParentByComment(commentInfo, commentModel, parentComment);
    }

    _setParentByPost(commentInfo, commentModel, post) {
        commentInfo.post = post;
        commentInfo.nestedLevel = 1;
        commentInfo.orderByTime = String(++post.currentCommentOrderingId);

        commentModel.parent = {
            post: { contentId: post.contentId },
            comment: { contentId: null },
        };

        commentModel.ordering = {
            byTime: String(commentInfo.orderByTime),
        };

        post.commentsCount++;
    }

    _setParentByComment(commentInfo, commentModel, parentComment) {
        commentInfo.post = parentComment.post;
        commentInfo.nestedLevel = parentComment.nestedLevel + 1;

        let indexBase = parentComment.orderByTime;

        if (parentComment.nestedLevel >= NESTED_COMMENTS_MAX_INDEX_DEPTH) {
            indexBase = indexBase
                .split('-')
                .slice(0, NESTED_COMMENTS_MAX_INDEX_DEPTH - 1)
                .join('-');
        }

        const commentOrderingIndex = ++parentComment.post.currentCommentOrderingId;

        commentInfo.orderByTime = `${indexBase}-${commentOrderingIndex}`;

        commentModel.parent = {
            post: { contentId: parentComment.post.contentId },
            comment: { contentId: parentComment.contentId },
        };

        commentModel.ordering = {
            byTime: commentInfo.orderByTime,
        };

        parentComment.post.commentsCount++;
    }

    _applyVotes(model, votes) {
        model.votes = {
            upVotes: [],
            upCount: 0,
            downVotes: [],
            downCount: 0,
        };

        for (const { voter: userId, weight } of votes) {
            const vote = { userId, weight };

            if (weight > 0) {
                model.votes.upVotes.push(vote);
                model.votes.upCount++;
            } else if (weight < 0) {
                model.votes.downVotes.push(vote);
                model.votes.downCount++;
            }
        }
    }

    _applyPayouts(model, { archived, payouts }) {
        const rewardTypes = ['author_reward', 'curator_reward', 'benefactor_reward'];

        model.payout = {};

        for (const rewardType of rewardTypes) {
            const rewardTypeKey = Payouts.getRewardTypeKey(rewardType);

            if (!rewardTypeKey) {
                continue;
            }

            const { tokenName, tokenValue } = Payouts.extractTokenInfo(payouts[rewardType]);

            if (!tokenName) {
                continue;
            }

            model.payout[rewardTypeKey] = {};
            model.payout[rewardTypeKey].token = {
                name: tokenName,
                value: tokenValue,
            };
        }

        if (archived) {
            model.payout.done = true;
        }
    }

    _addPayoutScoring(model, postState) {
        const rShares = Number(postState.netshares);

        model.stats = model.stats || {};
        model.stats.rShares = rShares;
        model.stats.hot = WilsonScoring.calcHot(rShares, model.meta.time);
        model.stats.trending = WilsonScoring.calcTrending(rShares, model.meta.time);
    }

    _incUserPostsCounter(userId) {
        let user = this._users.get(userId);

        if (!user) {
            user = {
                postsCount: 0,
                commentsCount: 0,
            };
            this._users.set(userId, user);
        }

        user.postsCount++;
    }

    _incUserCommentsCounter(userId) {
        let user = this._users.get(userId);

        if (!user) {
            user = {
                postsCount: 0,
                commentsCount: 0,
            };
            this._users.set(userId, user);
        }

        user.commentsCount++;
    }

    async _finishMessages() {
        Logger.info('Start finishing bulk writers');
        await Promise.all([this._postsBulk.finish(), this._commentsBulk.finish()]);

        Logger.info('Start updating post and user counters');
        await Promise.all([this._savePostsCounters(), this._saveUsersCounters()]);

        Logger.info('GenesisContent processing finished!');
    }

    async _savePostsCounters() {
        const postsPool = new ParallelPool({
            handler: this._handlePostUpdate.bind(this),
            parallelCount: 10,
        });

        postsPool.queueList([...this._posts.values()]);

        await postsPool.flush();
    }

    async _handlePostUpdate({ contentId, commentsCount }) {
        try {
            await PostModel.updateOne(
                {
                    'repost.isRepost': false,
                    'contentId.userId': contentId.userId,
                    'contentId.permlink': contentId.permlink,
                },
                {
                    $set: {
                        'stats.commentsCount': commentsCount,
                    },
                }
            );
            metrics.inc('genesis_posts_comments_count_updated');
        } catch (err) {
            metrics.inc('genesis_posts_comments_count_update_failed');
            Logger.error(`Updating post ${contentId.userId}/${contentId.permlink} failed:`, err);
        }
    }

    async _saveUsersCounters() {
        const usersPool = new ParallelPool({
            handler: this._handleUserUpdate.bind(this),
            parallelCount: 10,
        });

        for (const [userId, { postsCount, commentsCount }] of this._users) {
            usersPool.queue({
                userId,
                postsCount,
                commentsCount,
            });
        }

        await usersPool.flush();
    }

    async _handleUserUpdate({ userId, postsCount, commentsCount }) {
        try {
            const result = await ProfileModel.updateOne(
                { userId },
                {
                    $set: {
                        'stats.postsCount': postsCount,
                        'stats.commentsCount': commentsCount,
                    },
                }
            );

            if (result.nModified === 0) {
                metrics.inc('genesis_users_counters_update_user_miss');
            } else {
                metrics.inc('genesis_users_counters_updated');
            }
        } catch (err) {
            metrics.inc('genesis_users_counters_update_failed');
            Logger.error(`Updating profile (${userId}) failed:`, err);
        }
    }

    getQueueLength() {
        return (
            this._profilesBulk.getQueueLength() +
            this._postsBulk.getQueueLength() +
            this._commentsBulk.getQueueLength() +
            this._leadersBulk.getQueueLength() +
            this._subscribesSaver.getQueueLength()
        );
    }

    async _fetchCommentInfo(id) {
        metrics.inc('genesis_comments_cache_fetch');

        const [userId, permlink] = id.split('/');

        const model = await CommentModel.findOne(
            {
                'contentId.userId': userId,
                'contentId.permlink': permlink,
            },
            {
                _id: 0,
                'parent.post': 1,
                'ordering.byTime': 1,
            },
            {
                lean: true,
            }
        );

        if (!model) {
            Logger.error(`Comment not found (${id}).`);
            throw new Error('Comment not found');
        }

        const postContentId = `${model.parent.post.userId}/${model.parent.post.permlink}`;
        const post = this._posts.get(postContentId);

        if (!post) {
            Logger.error(`Comment not found (${postContentId}).`);
            throw new Error('Post not found');
        }

        return {
            contentId: {
                userId,
                permlink,
            },
            post,
            orderByTime: model.ordering.byTime,
        };
    }

    _handlePin({ pinner, pinning }) {
        this._subscribesSaver.add({ pinner, pinning });
    }

    async _handleWitnessState({ name, total_weight: rating, url, votes, active }) {
        this._leadersBulk.addEntry({
            communityId: 'gls',
            userId: name,
            url,
            rating,
            votes,
            active,
        });

        await ProfileModel.updateOne(
            {
                userId: name,
            },
            {
                $push: {
                    leaderIn: 'gls',
                },
            }
        );
    }
}

module.exports = GenesisContent;
