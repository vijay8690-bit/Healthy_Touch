import Provider from '../models/Provider.js';
import ProviderPayout from '../models/ProviderPayout.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import mongoose from 'mongoose';

const MIN_WITHDRAWAL_AMOUNT = 1000;

const roundMoney = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

const normalizeText = (value) => String(value || '').trim();

const getProviderWalletSummary = async (userId) => {
  const providerUserId = new mongoose.Types.ObjectId(userId);

  const payoutSummary = await ProviderPayout.aggregate([
    {
      $match: {
        providerId: providerUserId,
        status: { $in: ['PAID', 'RELEASED'] },
      },
    },
    {
      $group: {
        _id: null,
        totalEarned: { $sum: '$netAmount' },
      },
    },
  ]);

  const withdrawalSummary = await WithdrawalRequest.aggregate([
    { $match: { userId: providerUserId } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' },
      },
    },
  ]);

  const totals = withdrawalSummary.reduce(
    (acc, item) => {
      acc[item._id] = roundMoney(item.total);
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0, paid: 0 }
  );

  const totalEarned = roundMoney(payoutSummary[0]?.totalEarned || 0);
  const blockedWithdrawal = roundMoney(totals.pending + totals.approved);
  const totalWithdrawn = roundMoney(totals.paid);
  const availableBalance = Math.max(0, roundMoney(totalEarned - totalWithdrawn - blockedWithdrawal));

  return {
    totalEarned,
    pendingWithdrawal: blockedWithdrawal,
    totalWithdrawn,
    availableBalance,
    minimumWithdrawalAmount: MIN_WITHDRAWAL_AMOUNT,
  };
};

const validateWithdrawalPayload = (body) => {
  const amount = Number(body.amount);
  const accountHolderName = normalizeText(body.accountHolderName);
  const bankAccountNumber = normalizeText(body.bankAccountNumber);
  const ifscCode = normalizeText(body.ifscCode).toUpperCase();
  const upiId = normalizeText(body.upiId).toLowerCase();

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
    return { error: `Minimum withdrawal amount is Rs. ${MIN_WITHDRAWAL_AMOUNT}` };
  }

  if (accountHolderName.length < 2 || accountHolderName.length > 120) {
    return { error: 'Account holder name must be between 2 and 120 characters' };
  }

  if (!/^\d{9,18}$/.test(bankAccountNumber)) {
    return { error: 'Bank account number must be 9 to 18 digits' };
  }

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    return { error: 'Please enter a valid IFSC code' };
  }

  if (upiId && !/^[a-z0-9.\-_]{2,}@[a-z]{2,}$/i.test(upiId)) {
    return { error: 'Please enter a valid UPI ID' };
  }

  return {
    value: {
      amount: roundMoney(amount),
      accountHolderName,
      bankAccountNumber,
      ifscCode,
      upiId,
    },
  };
};

// @desc    Get provider withdrawal requests and wallet summary
// @route   GET /api/provider/withdrawals
// @access  Private/Provider
export const getProviderWithdrawals = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const [wallet, withdrawals] = await Promise.all([
      getProviderWalletSummary(userId),
      WithdrawalRequest.find({ userId })
        .sort({ requestedAt: -1 })
        .limit(100),
    ]);

    res.status(200).json({
      success: true,
      wallet,
      withdrawals,
    });
  } catch (error) {
    console.error('Get provider withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching withdrawals',
      error: error.message,
    });
  }
};

// @desc    Create provider withdrawal request
// @route   POST /api/provider/withdrawals
// @access  Private/Provider
export const createProviderWithdrawal = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const validation = validateWithdrawalPayload(req.body);

    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const wallet = await getProviderWalletSummary(userId);

    if (validation.value.amount > wallet.availableBalance) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal amount cannot exceed available balance',
        wallet,
      });
    }

    const provider = await Provider.findOne({ userId }).select('_id');
    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider profile not found. Please complete your provider profile before requesting withdrawal.',
      });
    }

    const withdrawal = await WithdrawalRequest.create({
      providerId: provider._id,
      userId,
      ...validation.value,
      requestedAt: new Date(),
    });

    const updatedWallet = await getProviderWalletSummary(userId);

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawal,
      wallet: updatedWallet,
    });
  } catch (error) {
    console.error('Create provider withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating withdrawal request',
      error: error.message,
    });
  }
};

// @desc    Get all withdrawal requests
// @route   GET /api/admin/withdrawals
// @access  Private/Admin
export const getAdminWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const withdrawals = await WithdrawalRequest.find(filter)
      .populate('userId', 'name email mobile')
      .populate('providerId', 'category specialization providerType')
      .sort({ requestedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await WithdrawalRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      withdrawals,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get admin withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching withdrawal requests',
      error: error.message,
    });
  }
};

export const approveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be approved' });
    }

    const wallet = await getProviderWalletSummary(withdrawal.userId);
    if (withdrawal.amount > wallet.availableBalance + withdrawal.amount) {
      return res.status(400).json({ success: false, message: 'Provider balance is insufficient for this request' });
    }

    withdrawal.status = 'approved';
    withdrawal.adminNote = normalizeText(req.body.adminNote);
    withdrawal.approvedAt = new Date();
    await withdrawal.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal request approved',
      withdrawal,
    });
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while approving withdrawal',
      error: error.message,
    });
  }
};

export const rejectWithdrawal = async (req, res) => {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (!['pending', 'approved'].includes(withdrawal.status)) {
      return res.status(400).json({ success: false, message: 'Only pending or approved requests can be rejected' });
    }

    withdrawal.status = 'rejected';
    withdrawal.adminNote = normalizeText(req.body.adminNote);
    withdrawal.rejectedAt = new Date();
    await withdrawal.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal request rejected',
      withdrawal,
    });
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting withdrawal',
      error: error.message,
    });
  }
};

export const markWithdrawalPaid = async (req, res) => {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only approved requests can be marked as paid' });
    }

    withdrawal.status = 'paid';
    withdrawal.transactionId = normalizeText(req.body.transactionId);
    withdrawal.adminNote = normalizeText(req.body.adminNote) || withdrawal.adminNote;
    withdrawal.paidAt = new Date();
    await withdrawal.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal request marked as paid',
      withdrawal,
    });
  } catch (error) {
    console.error('Mark withdrawal paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking withdrawal as paid',
      error: error.message,
    });
  }
};
