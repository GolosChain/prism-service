const core = require('gls-core-service');
const stats = core.utils.statsClient;
const BasicMain = core.services.BasicMain;
const Logger = core.utils.Logger;

const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');
const Cleaner = require('./services/Cleaner');
const FeedCache = require('./services/FeedCache');
const Sync = require('./services/Sync');
const ServiceMetaModel = require('./models/ServiceMeta');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Profile = require('./models/Profile');

class Main extends BasicMain {
    constructor() {
        super(stats, env);

        const feedCache = new FeedCache();
        const connector = new Connector({ feedCache });
        const cleaner = new Cleaner();
        const prism = new Prism({ connector });
        const sync = new Sync([Post, Profile, Comment], {
            Post: data => {
                return {
                    title: data.content.title,
                    body: data.content.body,
                    permlink: data.contentId.permlink,
                };
            },
            Profile: data => {
                return {
                    username: data.username,
                };
            },
            Comment: data => {
                return {
                    title: data.content.title,
                    body: data.content.body,
                    permlink: data.contentId.permlink,
                };
            },
        });
        this.startMongoBeforeBoot();
        this.addNested(cleaner, prism, feedCache, sync, connector);
    }

    async boot() {
        if ((await ServiceMetaModel.countDocuments()) === 0) {
            const model = new ServiceMetaModel();

            await model.save();
        }
    }
}

module.exports = Main;
