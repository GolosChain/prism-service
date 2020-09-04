const core = require('cyberway-core-service');
const { Logger, metrics, ParallelPool } = core.utils;
const ProfileModel = require('../models/Profile');

class SubscribesSaver {
    constructor() {
        this._currentUserId = null;
        this._currentUserSubscriptions = [];

        this._subscriptionsPool = new ParallelPool({
            handler: this._handleSubscriptionsUpdate.bind(this),
            parallelCount: 5,
        });

        this._subscribersPool = new ParallelPool({
            handler: this._handleSubscribersUpdate.bind(this),
            parallelCount: 10,
        });
    }

    add({ pinner, pinning }) {
        if (this._currentUserId !== pinner) {
            this._endCurrentUser();

            this._currentUserId = pinner;
            this._currentUserSubscriptions.push(pinning);
        }

        this._subscribersPool.queue({ userId: pinning, byUserId: pinner });
        metrics.inc('genesis_user_subscribers_queued');
    }

    getQueueLength() {
        return this._subscriptionsPool.getQueueLength() + this._subscribersPool.getQueueLength();
    }

    async finish() {
        this._endCurrentUser();

        Logger.info('Update subscriptions/subscribers flush started');
        await Promise.all([this._subscriptionsPool.flush(), this._subscribersPool.flush()]);
        Logger.info('Update subscriptions/subscribers flush done');
    }

    _endCurrentUser() {
        if (this._currentUserId) {
            const subscriptions = this._currentUserSubscriptions;

            this._subscriptionsPool.queue({
                userId: this._currentUserId,
                subscriptions,
            });
            metrics.inc('genesis_user_subscriptions_queued');
        }

        this._currentUserId = null;
        this._currentUserSubscriptions = [];
    }

    async _handleSubscriptionsUpdate({ userId, subscriptions }) {
        try {
            const result = await ProfileModel.updateOne(
                {
                    userId,
                },
                {
                    $push: {
                        'subscriptions.userIds': {
                            $each: subscriptions,
                        },
                    },
                    $inc: {
                        'subscriptions.usersCount': subscriptions.length,
                    },
                }
            );

            if (result.nModified === 0) {
                metrics.inc('genesis_user_subscriptions_update_user_miss');
            } else {
                metrics.inc('genesis_user_subscriptions_updated');
            }
        } catch (err) {
            Logger.error(`Cant update (${userId}) subscriptions:`, err);
            process.exit(1);
        }
    }

    async _handleSubscribersUpdate({ userId, byUserId }) {
        try {
            const result = await ProfileModel.updateOne(
                {
                    userId,
                },
                {
                    $push: {
                        'subscribers.userIds': byUserId,
                    },
                    $inc: {
                        'subscribers.usersCount': 1,
                    },
                }
            );

            if (result.nModified === 0) {
                metrics.inc('genesis_user_subscribers_update_user_miss');
            } else {
                metrics.inc('genesis_user_subscribers_updated');
            }
        } catch (err) {
            Logger.error(`Cant update (${userId}) subscribers:`, err);
            process.exit(1);
        }
    }
}

module.exports = SubscribesSaver;
