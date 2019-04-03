const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const env = require('../data/env');
const Comment = require('../controllers/connector/Comment');
const Feed = require('../controllers/connector/Feed');
const Post = require('../controllers/connector/Post');
const Profile = require('../controllers/connector/Profile');
const Notify = require('../controllers/connector/Notify');
const HashTag = require('../controllers/connector/HashTag');

class Connector extends BasicConnector {
    constructor({ feedCache }) {
        super();

        const linking = { connector: this };

        this._feed = new Feed({ feedCache, ...linking });
        this._comment = new Comment(linking);
        this._post = new Post(linking);
        this._profile = new Profile(linking);
        this._notify = new Notify(linking);
        this._hashTagTop = new HashTag(linking);
    }

    async start() {
        await super.start({
            serverRoutes: {
                getPost: this._post.getPost.bind(this._post),
                getComment: this._comment.getComment.bind(this._comment),
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
                            refBlockNum: {
                                type: 'number',
                            },
                            raw: {
                                type: 'boolean',
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
                            raw: {
                                type: 'boolean',
                            },
                        },
                    },
                },
                getProfile: this._profile.getProfile.bind(this._profile),
                getNotifyMeta: this._notify.getMeta.bind(this._notify),
                getHashTagTop: {
                    handler: this._hashTagTop.getTop,
                    scope: this._hashTagTop,
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
