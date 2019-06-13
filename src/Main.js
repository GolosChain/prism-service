const core = require('gls-core-service');
const BasicMain = core.services.BasicMain;
const Logger = core.utils.Logger;
const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');
const PostFeedCache = require('./services/PostFeedCache');
const LeaderFeedCache = require('./services/LeaderFeedCache');
const SearchSync = require('./services/SerarchSync');
const Fork = require('./services/Fork');
const ServiceMetaModel = require('./models/ServiceMeta');
const Post = require('./models/Post');
const GolosUserExporter = require('./scripts/GolosUserExporter');

class Main extends BasicMain {
    constructor() {
        super(env);

        const postFeedCache = new PostFeedCache();
        const leaderFeedCache = new LeaderFeedCache();
        const prism = new Prism();
        const connector = new Connector({ postFeedCache, leaderFeedCache, prism });
        const searchSync = new SearchSync();
        const fork = new Fork();

        prism.setForkService(fork);
        prism.setConnector(connector);

        this.startMongoBeforeBoot();
        this.addNested(fork, prism, postFeedCache, leaderFeedCache);

        if (env.GLS_SEARCH_ENABLED) {
            this.addNested(searchSync);
        }

        this.addNested(connector);
    }

    async boot() {
        await this._setDbQueryMemoryLimit();
        await this._tryRestoreGolosUsers();
        await this._initMetadata();
    }

    async _setDbQueryMemoryLimit() {
        try {
            await Post.db.db.command({
                setParameter: 1,
                internalQueryExecMaxBlockingSortBytes: env.GLS_MAX_QUERY_MEMORY_LIMIT,
            });
        } catch (err) {
            Logger.warn('Can`t set MongoDB memory limit');
        }
    }

    async _tryRestoreGolosUsers() {
        if (env.GLS_EXPORT_GOLOS_USERS) {
            await new GolosUserExporter().exportUsers(
                this._mongoDb,
                env.GLS_EXPORT_GOLOS_USERS_CONNECT
            );
        }
    }

    async _initMetadata() {
        if ((await ServiceMetaModel.countDocuments()) === 0) {
            const model = new ServiceMetaModel();

            await model.save();
        }
    }
}

module.exports = Main;
