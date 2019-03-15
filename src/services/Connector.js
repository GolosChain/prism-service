const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const Comment = require('../controllers/connector/Comment');
const Feed = require('../controllers/connector/Feed');
const Post = require('../controllers/connector/Post');
const Profile = require('../controllers/connector/Profile');
const Notify = require('../controllers/connector/Notify');

class Connector extends BasicConnector {
    constructor({ feedCache }) {
        super();

        const linking = { connector: this };

        this._feed = new Feed({ feedCache, ...linking });
        this._comment = new Comment(linking);
        this._post = new Post(linking);
        this._profile = new Profile(linking);
        this._notify = new Notify(linking);
    }

    async start() {
        await super.start({
            serverRoutes: {
                getComments: this._comment.getComments.bind(this._comment),
                getPost: this._post.getPost.bind(this._post),
                getFeed: this._feed.getFeed.bind(this._feed),
                getProfile: this._profile.getProfile.bind(this._profile),
                getNotifyMeta: this._notify.getMeta.bind(this._notify),
            },
        });
    }
}

module.exports = Connector;
