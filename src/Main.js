const core = require('gls-core-service');
const stats = core.utils.statsClient;
const BasicMain = core.services.BasicMain;
const Logger = core.utils.Logger;
const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');
const Cleaner = require('./services/Cleaner');
const PostFeedCache = require('./services/PostFeedCache');
const LeaderFeedCache = require('./services/LeaderFeedCache');
const Sync = require('./services/Sync');
const ServiceMetaModel = require('./models/ServiceMeta');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Profile = require('./models/Profile');
const GolosUserExporter = require('./scripts/GolosUserExporter');

class Main extends BasicMain {
    constructor() {
        super(stats, env);

        const postFeedCache = new PostFeedCache();
        const leaderFeedCache = new LeaderFeedCache();
        const prism = new Prism();
        const connector = new Connector({ postFeedCache, leaderFeedCache, prism });
        const cleaner = new Cleaner();
        const sync = new Sync([Post, Comment], {
            Post: data => {
                return {
                    title: data.content.title,
                    body: data.content.body,
                    permlink: data.contentId.permlink,
                    contentId: data.contentId,
                };
            },
            Comment: data => {
                return {
                    title: data.content.title,
                    body: data.content.body,
                    permlink: data.contentId.permlink,
                    contentId: data.contentId,
                };
            },
        });

        prism.setConnector(connector);
        this.startMongoBeforeBoot();
        this.addNested(cleaner, prism, postFeedCache, leaderFeedCache);
        if (env.GLS_SEARCH_ENABLED) {
            this.addNested(sync);
        }
        this.addNested(connector);
    }

    async boot() {
        if (env.GLS_EXPORT_GOLOS_USERS) {
            await new GolosUserExporter().exportUsers(
                this._mongoDb,
                env.GLS_EXPORT_GOLOS_USERS_CONNECT
            );
        }

        if ((await ServiceMetaModel.countDocuments()) === 0) {
            const model = new ServiceMetaModel();

            await model.save();
        }
    }
}

module.exports = Main;
