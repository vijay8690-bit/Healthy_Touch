import User from '../models/User.js';

export const REWARD_TYPES = {
    FIRST_SIGNUP: 'FIRST_SIGNUP',
    FIRST_APPOINTMENT: 'FIRST_APPOINTMENT',
    APPOINTMENT_BOOKING: 'APPOINTMENT_BOOKING',
    REFERRAL_BONUS: 'REFERRAL_BONUS',
    COIN_REDEMPTION: 'COIN_REDEMPTION',
};

export const REWARD_COINS = {
    [REWARD_TYPES.FIRST_SIGNUP]: 50,
    [REWARD_TYPES.FIRST_APPOINTMENT]: 100,
    [REWARD_TYPES.APPOINTMENT_BOOKING]: 10,
    [REWARD_TYPES.REFERRAL_BONUS]: 150,
};

/**
 * Adds coins once per idempotencyKey and records a complete ledger entry.
 * Pass a stable key for rewards that must never be duplicated.
 */
export const addCoins = async ({
    userId,
    amount,
    type,
    description,
    idempotencyKey,
    metadata = {},
}) => {
    if (!userId || !amount || amount <= 0) {
        return null;
    }

    const historyEntry = {
        amount,
        type,
        description,
        idempotencyKey,
        metadata,
        createdAt: new Date(),
    };

    const query = { _id: userId };
    if (idempotencyKey) {
        query.coinHistory = { $not: { $elemMatch: { idempotencyKey } } };
    }

    return User.findOneAndUpdate(
        query,
        {
            $inc: { coins: amount },
            $push: { coinHistory: historyEntry },
        },
        { new: true }
    ).select('coins referralCode coinHistory');
};

export const addRewardCoins = async ({ userId, type, description, idempotencyKey, metadata }) => {
    return addCoins({
        userId,
        amount: REWARD_COINS[type],
        type,
        description,
        idempotencyKey,
        metadata,
    });
};

export const redeemCoins = async ({
    userId,
    amount,
    description,
    idempotencyKey,
    metadata = {},
}) => {
    if (!userId || !amount || amount <= 0) {
        return null;
    }

    const historyEntry = {
        amount: -amount,
        type: REWARD_TYPES.COIN_REDEMPTION,
        description,
        idempotencyKey,
        metadata,
        createdAt: new Date(),
    };

    const query = {
        _id: userId,
        coins: { $gte: amount },
    };
    if (idempotencyKey) {
        query.coinHistory = { $not: { $elemMatch: { idempotencyKey } } };
    }

    return User.findOneAndUpdate(
        query,
        {
            $inc: { coins: -amount },
            $push: { coinHistory: historyEntry },
        },
        { new: true }
    ).select('coins referralCode coinHistory');
};

export const awardSignupRewards = async (user) => {
    if (!user) {
        return null;
    }

    let awardedAnyReward = false;

    if (user.role === 'patient') {
        await addRewardCoins({
            userId: user._id,
            type: REWARD_TYPES.FIRST_SIGNUP,
            description: 'First signup reward',
            idempotencyKey: `first-signup:${user._id}`,
        });
        awardedAnyReward = true;
    }

    if (user.referredBy) {
        await addRewardCoins({
            userId: user.referredBy,
            type: REWARD_TYPES.REFERRAL_BONUS,
            description: `Referral bonus for inviting ${user.name}`,
            idempotencyKey: `referral:${user._id}`,
            metadata: { referredUserId: user._id, referredUserRole: user.role },
        });
        awardedAnyReward = true;
    }

    if (!awardedAnyReward) {
        return null;
    }

    return User.findById(user._id).select('-password -otp');
};

export const awardAppointmentRewards = async ({ userId, appointmentId, isFirstAppointment }) => {
    if (!userId || !appointmentId) {
        return null;
    }

    await addRewardCoins({
        userId,
        type: REWARD_TYPES.APPOINTMENT_BOOKING,
        description: 'Appointment booking reward',
        idempotencyKey: `appointment-booking:${appointmentId}`,
        metadata: { appointmentId },
    });

    if (isFirstAppointment) {
        await addRewardCoins({
            userId,
            type: REWARD_TYPES.FIRST_APPOINTMENT,
            description: 'First appointment reward',
            idempotencyKey: `first-appointment:${userId}`,
            metadata: { appointmentId },
        });
    }

    return User.findById(userId).select('-password -otp');
};
