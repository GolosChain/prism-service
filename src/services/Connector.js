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

class Connector extends BasicConnector {
    constructor({ postFeedCache, leaderFeedCache, prism }) {
        super();

        const linking = { connector: this };

        this._feed = new Feed({ postFeedCache, ...linking });
        this._comment = new Comment(linking);
        this._post = new Post(linking);
        this._profile = new Profile(linking);
        this._notify = new Notify(linking);
        this._hashTag = new HashTag(linking);
        this._leaders = new Leaders({ leaderFeedCache, ...linking });
        this._block = new Block({ prismService: prism, ...linking });
        this._search = new Search(linking);
    }

    async start() {
        await super.start({
            serverRoutes: {
                search: {
                    handler: this._search.search,
                    scope: this._search,
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
                    validation: {
                        required: ['permlink'],
                        properties: {
                            currentUserId: {
                                type: 'string',
                            },
                            requestedUserId: {
                                type: 'string',
                            },
                            permlink: {
                                type: 'string',
                            },
                            contentType: {
                                type: 'string',
                                default: 'web',
                                enum: ['web', 'mobile', 'raw'],
                            },
                            username: {
                                type: 'string',
                            },
                            app: {
                                type: 'string',
                                enum: ['cyber', 'gls'],
                                default: 'cyber',
                            },
                        },
                    },
                },
                getComment: {
                    handler: this._comment.getComment,
                    scope: this._comment,
                    validation: {
                        required: ['permlink'],
                        properties: {
                            currentUserId: {
                                type: 'string',
                            },
                            requestedUserId: {
                                type: 'string',
                            },
                            permlink: {
                                type: 'string',
                            },
                            contentType: {
                                type: 'string',
                                default: 'web',
                                enum: ['web', 'mobile', 'raw'],
                            },
                            username: {
                                type: 'string',
                            },
                            app: {
                                type: 'string',
                                enum: ['cyber', 'gls'],
                                default: 'cyber',
                            },
                        },
                    },
                },
                getComments: {
                    handler: this._comment.getComments,
                    scope: this._comment,
                    inherits: ['feedPagination'],
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
                            currentUserId: {
                                type: ['string', 'null'],
                            },
                            requestedUserId: {
                                type: 'string',
                            },
                            permlink: {
                                type: 'string',
                            },
                            contentType: {
                                type: 'string',
                                default: 'web',
                                enum: ['web', 'mobile', 'raw'],
                            },
                            username: {
                                type: 'string',
                            },
                            app: {
                                type: 'string',
                                enum: ['cyber', 'gls'],
                                default: 'cyber',
                            },
                        },
                    },
                },
                getFeed: {
                    handler: this._feed.getFeed,
                    scope: this._feed,
                    inherits: ['feedPagination'],
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
                            currentUserId: {
                                type: ['string', 'null'],
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
                            contentType: {
                                type: 'string',
                                default: 'web',
                                enum: ['web', 'mobile', 'raw'],
                            },
                            username: {
                                type: 'string',
                            },
                            app: {
                                type: 'string',
                                enum: ['cyber', 'gls'],
                                default: 'cyber',
                            },
                        },
                    },
                },
                getProfile: {
                    handler: this._profile.getProfile,
                    scope: this._profile,
                    validation: {
                        required: [],
                        properties: {
                            currentUserId: {
                                type: 'string',
                            },
                            requestedUserId: {
                                type: 'string',
                            },
                            type: {
                                type: 'string',
                                default: 'cyber',
                                enum: ['gls', 'cyber'],
                            },
                            username: {
                                type: 'string',
                            },
                            app: {
                                type: 'string',
                                enum: ['cyber', 'gls'],
                                default: 'cyber',
                            },
                        },
                    },
                },
                getNotifyMeta: {
                    handler: this._notify.getMeta,
                    scope: this._notify,
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
                            username: {
                                type: 'string',
                            },
                            app: {
                                type: 'string',
                            },
                        },
                    },
                },
                getHashTagTop: {
                    handler: this._hashTag.getTop,
                    scope: this._hashTag,
                    inherits: ['feedPagination'],
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
                    inherits: ['feedPagination'],
                    validation: {
                        required: ['communityId'],
                        properties: {
                            currentUserId: {
                                type: 'string',
                            },
                            communityId: {
                                type: 'string',
                            },
                            app: {
                                type: 'string',
                                enum: ['cyber', 'gls'],
                                default: 'cyber',
                            },
                        },
                    },
                },
                waitForBlock: {
                    handler: this._block.waitForBlock,
                    scope: this._block,
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
                    handler: this._post.getPostVotes,
                    scope: this._post,
                    validation: {
                        required: ['requestedUserId', 'permlink', 'refBlockNum'],
                        properties: {
                            requestedUserId: {
                                type: 'string',
                            },
                            permlink: {
                                type: 'string',
                            },
                            refBlockNum: {
                                type: 'number',
                            },
                        },
                    },
                },
                getCommentVotes: {
                    handler: this._comment.getCommentVotes,
                    scope: this._comment,
                    validation: {
                        required: ['requestedUserId', 'permlink', 'refBlockNum'],
                        properties: {
                            requestedUserId: {
                                type: 'string',
                            },
                            permlink: {
                                type: 'string',
                            },
                            refBlockNum: {
                                type: 'number',
                            },
                        },
                    },
                },
                resolveProfile: {
                    handler: this._profile.resolveProfile,
                    scope: this._profile,
                    validation: {
                        required: ['username', 'app'],
                        properties: {
                            username: {
                                type: 'string',
                            },
                            app: {
                                type: 'string',
                                enum: ['cyber', 'gls'],
                                default: 'cyber',
                            },
                        },
                    },
                },
                getSubscriptions: {
                    handler: this._profile.getSubscriptions,
                    scope: this._profile,
                    inherits: ['feedPagination'],
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
                    inherits: ['feedPagination'],
                    validation: {
                        required: ['requestedUserId'],
                        properties: {
                            requestedUserId: {
                                type: 'string',
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
                },
            },
            requiredClients: {
                facade: env.GLS_FACADE_CONNECT,
            },
        });
    }
}

module.exports = Connector;
