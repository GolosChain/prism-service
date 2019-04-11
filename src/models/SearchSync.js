const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'SearchSync',
    {
        model: {
            type: String,
            required: true,
        },
        lastSynced: {
            type: Date,
            default: new Date(null),
            // default: Date.now(),
        },
        inSync: {
            type: Boolean,
            required: true,
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    model: 1,
                    lastSynced: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
