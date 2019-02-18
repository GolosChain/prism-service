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
                id: {
                    userId: requestedUserId,
                    permlink,
                    refBlockNum,
                },
            },
            {
                'content.body.preview': false,
                _id: false,
                __v: false,
                createdAt: false,
                updatedAt: false,
                upUserIds: false,
                downUserIds: false,
            },
            { lean: true }
        );

        if (!modelObject) {
            throw { code: 404, message: 'Not found' };
        }

        if (currentUserId) {
            const { hasUpVote, hasDownVote } = this._detectVotes(
                Model,
                modelObject.id,
                currentUserId
            );

            modelObject.votes.hasUpVote = hasUpVote;
            modelObject.votes.hasDownVote = hasDownVote;
        }

        return modelObject;
    }
}

module.exports = Post;
