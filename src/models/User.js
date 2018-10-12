const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'User',
    {
        name: {
            type: String,
            required: true,
        },
        metaName: {
            type: String,
        },
        profileImage: {
            type: String,
        },
        coverImage: {
            type: String,
        },
        about: {
            type: String,
        },
        location: {
            type: String,
        },
        website: {
            type: String,
        },
        pinnedPosts: {
            type: [String],
        },
    },
    {
        index: [
            {
                fields: {
                    name: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
