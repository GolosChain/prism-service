const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Leader',
    {
        communityId: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            default: '',
        },
        rating: {
            type: String,
            default: '0',
        },
        votes: {
            type: [String],
            default: [],
        },
        active: {
            type: Boolean,
            default: true,
        },
        position: {
            type: Number,
            default: null,
        },
    },
    {
        index: [
            {
                // search for find leader aggregation
                fields: {
                    userId: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                // Search for change
                fields: {
                    communityId: 1,
                    userId: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                // Top
                fields: {
                    communityId: 1,
                    position: 1,
                },
            },
            {
                // Detect votes
                fields: {
                    _id: 1,
                    votes: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
        schema: {
            collation: { locale: 'en_US', numericOrdering: true },
        },
    }
);
