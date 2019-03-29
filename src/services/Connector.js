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
                getComments: this._comment.getComments.bind(this._comment),
                getFeed: this._feed.getFeed.bind(this._feed),
                getProfile: this._profile.getProfile.bind(this._profile),
                getNotifyMeta: this._notify.getMeta.bind(this._notify),
                getHashTagTop: {
                    handler: this._hashTagTop.getTop,
                    scope: this._hashTagTop,
                    validation: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['communityId'],
                        properties: {
                            communityId: { type: 'string' },
                            limit: {
                                type: 'number',
                                default: 10,
                                minValue: 0,
                                maxValue: env.GLS_MAX_FEED_LIMIT,
                            },
                            sequenceKey: { type: 'string' },
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
