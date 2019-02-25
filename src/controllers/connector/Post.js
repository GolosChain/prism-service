const AbstractContent = require('./AbstractContent');
const Model = require('../../models/Post');

class Post extends AbstractContent {
    async getPost({ currentUserId, requestedUserId, permlink, refBlockNum }) {
        currentUserId = String(currentUserId);
        requestedUserId = String(requestedUserId);
        permlink = String(permlink);
        refBlockNum = Number(refBlockNum);

        const modelObject = await Model.findOne(
            {
                contentId: {
                    userId: requestedUserId,
                    permlink,
                    refBlockNum,
                },
            },
            {
                'content.body.preview': false,
                'votes.upUserIds': false,
                'votes.downUserIds': false,
                _id: false,
                __v: false,
                createdAt: false,
                updatedAt: false,
            },
            { lean: true }
        );

        if (!modelObject) {
            throw { code: 404, message: 'Not found' };
        }

        await this._tryApplyVotes({ Model, modelObject, currentUserId });
        await this._populateCommunities([modelObject]);

        return modelObject;
    }
}

module.exports = Post;
