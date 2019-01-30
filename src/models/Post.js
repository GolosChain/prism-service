const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Post',
    {
        id: {
            type: String,
        },
        meta: {
            time: {
                type: Date,
            },
        },
        author: {
            name: {
                type: String,
            },
        },
        content: {
            title: {
                type: String,
            },
            body: {
                full: {
                    type: String,
                },
                preview: {
                    type: String,
                },
            },
        },
        votes: {
            // Inner use only
            upUserList: {
                type: [String],
            },
            // Inner use only
            downUserList: {
                type: [String],
            },
            
            /*
            Extra fields:

            upByUser: {
                type: Boolean,
                default: false,
            },

            downByUser: {
                type: Boolean,
                default: false,
            },
             */
        },
        comments: {
            count: {
                type: Number,
            },
        },
        community: {
            name: {
                type: String,
            },
            avatarUrl: {
                type: String,
            },
        },
        payout: {
            rShares: {
                type: Number,
            },
        },
    },
    {
        index: [
            // TODO Mixed feed indexes
            // Default
            {
                fields: {
                    id: 1,
                },
                options: {
                    unique: true,
                },
            },
            // Personal feed
            {
                fields: {
                    'author.name': 1,
                },
            },
            // Time-sorted feed
            {
                fields: {
                    'meta.time': -1,
                },
            },
        ],
    }
);
