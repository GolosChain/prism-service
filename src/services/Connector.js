const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const env = require('../data/env');
const Comment = require('../controllers/connector/Comment');
const Feed = require('../controllers/connector/Feed');
const Post = require('../controllers/connector/Post');
const Profile = require('../controllers/connector/Profile');
const Notify = require('../controllers/connector/Notify');
const HashTag = require('../controllers/connector/HashTag');
const Leaders = require('../controllers/connector/Leaders');
const Block = require('../controllers/connector/Block');
const Search = require('../controllers/connector/Search');
const Vote = require('../controllers/connector/Vote');
const CommunitySettings = require('../controllers/connector/CommunitySettings');

class Connector extends BasicConnector {
    constructor({ postFeedCache, leaderFeedCache, prism }) {
        super();

        const linking = { connector: this };
        const empty = {};

        if (env.GLS_ENABLE_BLOCK_HANDLE) {
            this._block = new Block({ prismService: prism, ...linking });
        } else {
            this._block = empty;
        }

        if (env.GLS_ENABLE_PUBLIC_API) {
            this._feed = new Feed({ postFeedCache, ...linking });
            this._comment = new Comment(linking);
            this._post = new Post(linking);
            this._profile = new Profile(linking);
            this._notify = new Notify(linking);
            this._hashTag = new HashTag(linking);
            this._leaders = new Leaders({ leaderFeedCache, ...linking });
            this._search = new Search(linking);
            this._vote = new Vote(linking);
            this._communitySettings = new CommunitySettings(linking);
        } else {
            this._feed = empty;
            this._comment = empty;
            this._post = empty;
            this._profile = empty;
            this._notify = empty;
            this._hashTag = empty;
            this._leaders = empty;
            this._search = empty;
            this._vote = empty;
            this._communitySettings = empty;
        }
    }

    async start() {
        await super.start({
            serverRoutes: {
                search: {
                    handler: this._search.search,
                    scope: this._search,
                    inherits: ['onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['text'],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['matchPrefix', 'match'],
                                default: 'matchPrefix',
                            },
                            where: {
                                type: 'string',
                                enum: ['all', 'post', 'comment'],
                                default: 'all',
                            },
                            text: {
                                type: 'string',
                            },
                            field: {
                                type: 'string',
                                enum: ['all', 'title', 'raw', 'full', 'preview', 'permlink'],
                                default: 'all',
                            },
                            limit: {
                                type: 'number',
                                default: 10,
                            },
                            offset: {
                                type: 'number',
                                default: 0,
                            },
                        },
                    },
                },
                getPost: {
                    handler: this._post.getPost,
                    scope: this._post,
                    inherits: [
                        'appSpecify',
                        'userByName',
                        'userByAnyName',
                        'contentId',
                        'contentType',
                        'userRelativity',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: ['permlink'],
                        properties: {},
                    },
                },
                getComment: {
                    handler: this._comment.getComment,
                    scope: this._comment,
                    inherits: [
                        'appSpecify',
                        'userByName',
                        'userByAnyName',
                        'contentId',
                        'contentType',
                        'userRelativity',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: ['permlink'],
                        properties: {},
                    },
                },
                getComments: {
                    handler: this._comment.getComments,
                    scope: this._comment,
                    inherits: [
                        'feedPagination',
                        'appSpecify',
                        'userByName',
                        'contentId',
                        'contentType',
                        'optionalUserRelativity',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: [],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['post', 'user', 'replies'],
                                default: 'post',
                            },
                            sortBy: {
                                type: 'string',
                                enum: ['time', 'timeDesc'],
                                default: 'time',
                            },
                        },
                    },
                },
                getFeed: {
                    handler: this._feed.getFeed,
                    scope: this._feed,
                    inherits: [
                        'feedPagination',
                        'appSpecify',
                        'userByName',
                        'contentType',
                        'optionalUserRelativity',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: [],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['community', 'subscriptions', 'byUser'],
                                default: 'community',
                            },
                            sortBy: {
                                type: 'string',
                                enum: ['time', 'timeDesc', 'popular'],
                                default: 'time',
                            },
                            timeframe: {
                                type: 'string',
                                enum: [
                                    'day',
                                    'week',
                                    'month',
                                    'year',
                                    'all',
                                    'WilsonHot',
                                    'WilsonTrending',
                                ],
                                default: 'day',
                            },
                            requestedUserId: {
                                type: 'string',
                            },
                            communityId: {
                                type: 'string',
                            },
                            tags: {
                                type: 'array',
                            },
                        },
                    },
                },
                getProfile: {
                    handler: this._profile.getProfile,
                    scope: this._profile,
                    inherits: [
                        'appSpecify',
                        'userByName',
                        'userRelativity',
                        'onlyWhenPublicApiEnabled',
                        'userByAnyName',
                    ],
                    validation: {
                        required: [],
                        properties: {
                            requestedUserId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getChargers: {
                    handler: this._profile.getChargers,
                    scope: this._profile,
                    inherits: ['onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                        },
                    },
                },
                suggestNames: {
                    handler: this._profile.suggestNames,
                    scope: this._profile,
                    inherits: ['appSpecify', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['text'],
                        properties: {
                            text: {
                                type: 'string',
                            },
                        },
                    },
                },
                getNotifyMeta: {
                    handler: this._notify.getMeta,
                    scope: this._notify,
                    inherits: ['appSpecify', 'userByName', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        properties: {
                            userId: {
                                type: 'string',
                            },
                            communityId: {
                                type: 'string',
                            },
                            postId: {
                                type: 'object',
                            },
                            commentId: {
                                type: 'object',
                            },
                            contentId: {
                                type: 'object',
                            },
                        },
                    },
                },
                getHashTagTop: {
                    handler: this._hashTag.getTop,
                    scope: this._hashTag,
                    inherits: ['feedPagination', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['communityId'],
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getLeadersTop: {
                    handler: this._leaders.getTop,
                    scope: this._leaders,
                    inherits: [
                        'feedPagination',
                        'appSpecify',
                        'userRelativity',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: ['communityId'],
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            query: {
                                type: 'string',
                            },
                        },
                    },
                },
                getProposals: {
                    handler: this._leaders.getProposals,
                    scope: this._leaders,
                    inherits: ['feedPagination', 'appSpecify', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['communityId'],
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                        },
                    },
                },
                waitForBlock: {
                    handler: this._block.waitForBlock,
                    scope: this._block,
                    inherits: ['onlyWhenBlockHandleEnabled'],
                    validation: {
                        required: ['blockNum'],
                        properties: {
                            blockNum: {
                                type: 'number',
                                minValue: 0,
                            },
                        },
                    },
                },
                waitForTransaction: {
                    handler: this._block.waitForTransaction,
                    scope: this._block,
                    inherits: ['onlyWhenBlockHandleEnabled'],
                    validation: {
                        required: ['transactionId'],
                        properties: {
                            transactionId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getPostVotes: {
                    handler: this._vote.getPostVotes,
                    scope: this._vote,
                    inherits: [
                        'contentId',
                        'userRelativity',
                        'feedPagination',
                        'appSpecify',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: ['requestedUserId', 'permlink', 'type'],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['like', 'dislike'],
                            },
                        },
                    },
                },
                getCommentVotes: {
                    handler: this._vote.getCommentVotes,
                    scope: this._vote,
                    inherits: [
                        'contentId',
                        'userRelativity',
                        'feedPagination',
                        'appSpecify',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: ['requestedUserId', 'permlink', 'type'],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['like', 'dislike'],
                            },
                        },
                    },
                },
                resolveProfile: {
                    handler: this._profile.resolveProfile,
                    scope: this._profile,
                    inherits: ['appSpecify', 'userByName', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['username', 'app'],
                        properties: {},
                    },
                },
                getSubscriptions: {
                    handler: this._profile.getSubscriptions,
                    scope: this._profile,
                    inherits: [
                        'feedPagination',
                        'appSpecify',
                        'userRelativity',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: ['requestedUserId'],
                        properties: {
                            requestedUserId: {
                                type: 'string',
                            },
                            type: {
                                type: 'string',
                                enum: ['user', 'community'],
                            },
                        },
                    },
                },
                getSubscribers: {
                    handler: this._profile.getSubscribers,
                    scope: this._profile,
                    inherits: [
                        'feedPagination',
                        'appSpecify',
                        'userRelativity',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: ['requestedUserId'],
                        properties: {
                            requestedUserId: {
                                type: 'string',
                            },
                            type: {
                                type: 'string',
                                enum: ['user', 'community'],
                            },
                        },
                    },
                },
                getCommunitySettings: {
                    handler: this._communitySettings.getSettings,
                    scope: this._communitySettings,
                    validation: {
                        required: ['communityId'],
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            contracts: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
            serverDefaults: {
                parents: {
                    feedPagination: {
                        validation: {
                            properties: {
                                limit: {
                                    type: 'number',
                                    default: 10,
                                    minValue: 1,
                                    maxValue: env.GLS_MAX_FEED_LIMIT,
                                },
                                sequenceKey: {
                                    type: ['string', 'null'],
                                },
                            },
                        },
                    },
                    appSpecify: {
                        validation: {
                            properties: {
                                app: {
                                    type: 'string',
                                    enum: ['cyber', 'gls'],
                                    default: 'cyber',
                                },
                            },
                        },
                    },
                    userByName: {
                        validation: {
                            properties: {
                                username: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    userByAnyName: {
                        validation: {
                            properties: {
                                user: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    contentId: {
                        validation: {
                            properties: {
                                requestedUserId: {
                                    type: 'string',
                                },
                                permlink: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    contentType: {
                        validation: {
                            properties: {
                                contentType: {
                                    type: 'string',
                                    default: 'web',
                                    enum: ['web', 'mobile', 'raw'],
                                },
                            },
                        },
                    },
                    userRelativity: {
                        validation: {
                            properties: {
                                currentUserId: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    optionalUserRelativity: {
                        validation: {
                            properties: {
                                currentUserId: {
                                    type: ['string', 'null'],
                                },
                            },
                        },
                    },
                    onlyWhenBlockHandleEnabled: {
                        before: [{ handler: this._onlyWhenBlockHandleEnabled, scope: this }],
                    },
                    onlyWhenPublicApiEnabled: {
                        before: [{ handler: this._onlyWhenPublicApiEnabled, scope: this }],
                    },
                },
            },
            requiredClients: {
                facade: env.GLS_FACADE_CONNECT,
                meta: env.GLS_META_CONNECT,
            },
        });
    }

    _onlyWhenBlockHandleEnabled() {
        if (!env.GLS_ENABLE_BLOCK_HANDLE) {
            throw { code: 405, message: 'Method disabled by configuration' };
        }
    }

    _onlyWhenPublicApiEnabled() {
        if (!env.GLS_ENABLE_PUBLIC_API) {
            throw { code: 405, message: 'Method disabled by configuration' };
        }
    }
}

module.exports = Connector;
