const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Post',
    {
        parentPermlink: {
            type: String,
        },
        author: {
            type: String,
        },
        permlink: {
            type: String,
        },
        title: {
            type: String,
        },
        body: {
            type: String,
        },
        rawJsonMetadata: {
            type: String,
        },
        metadata: {
            app: {
                type: String,
            },
            format: {
                type: String,
            },
            tags: {
                type: [String],
                default: [],
            },
            images: {
                type: [String],
                default: [],
            },
            links: {
                type: [String],
                default: [],
            },
            users: {
                type: [String],
                default: [],
            },
        }
    },
    {
        index: [
            // TODO -
        ],
    }
);
