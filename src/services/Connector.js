const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const Comment = require('../controllers/connector/Comment');
const Feed = require('../controllers/connector/Feed');
const Post = require('../controllers/connector/Post');
const Profile = require('../controllers/connector/Profile');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._comment = new Comment({ connector: this });
        this._feed = new Feed({ connector: this });
        this._post = new Post({ connector: this });
        this._profile = new Profile({ connector: this });
    }

    async start() {
        await super.start({
            serverRoutes: {
                getComments: this._comment.getComments.bind(this._comment),
                getPost: this._post.getPost.bind(this._post),
                getFeed: this._feed.getFeed.bind(this._feed),
                getProfile: this._profile.getProfile.bind(this._profile),
            },
        });
    }
}

module.exports = Connector;
