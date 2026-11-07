import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { authMiddleware } from '../middleware.ts';
import type { AuthenticatedRequest } from '../middleware.ts';
import type { Withdrawal } from '../types.ts';

const router = Router();

// 1. Get Current User's Dual Wallet Accounting Views
router.get('/my', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const wallet = db.getOrCreateWallet(userId);

  // Retrieve user's ledger transactions
  const transactions = db
    .getFinancialLedger()
    .filter((l) => l.payeeId === userId || l.payerId === userId);

  // Retrieve user's withdrawals
  const withdrawals = db
    .getWithdrawals()
    .filter((w) => w.userId === userId);

  // Wallet 1 Accounting View: Earnings & Pending Funds
  const wallet1Earnings = {
    grossEarnings: wallet.grossEarnings,
    escrowPendingAmount: wallet.escrowPendingAmount,
    totalPlatformFeesDeducted: transactions
      .filter((t) => t.payeeId === userId && t.escrowStatus === 'RELEASED_TO_PARTNER')
      .reduce((acc, t) => acc + t.platformFee, 0),
    releasedEarnings: wallet.grossEarnings,
    transactions,
  };

  // Wallet 2 Accounting View: Available Withdrawal Balance
  const wallet2Withdrawals = {
    availableWithdrawableBalance: wallet.availableWithdrawableBalance,
    totalWithdrawn: wallet.totalWithdrawn,
    pendingWithdrawalsCount: withdrawals.filter((w) => w.status === 'PENDING').length,
    completedWithdrawalsCount: withdrawals.filter((w) => w.status === 'COMPLETED').length,
    withdrawals,
  };

  res.json({
    wallet1Earnings,
    wallet2Withdrawals,
    rawWallet: wallet,
  });
});

// 2. Request Payout / Withdrawal
router.post('/withdraw', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { amount, payoutMode, payoutDetails } = req.body;

  if (!amount || !payoutMode || !payoutDetails) {
    res.status(400).json({ error: 'Amount, payout mode (UPI / Bank Transfer), and account details are required.' });
    return;
  }

  const withdrawAmount = parseFloat(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    res.status(400).json({ error: 'Please enter a valid positive withdrawal amount.' });
    return;
  }

  const wallet = db.getOrCreateWallet(user.id);

  // Strict server-side balance validation:
  // Escrow-locked funds are strictly locked and cannot be withdrawn!
  if (wallet.availableWithdrawableBalance < withdrawAmount) {
    res.status(400).json({
      error: `Insufficient withdrawable balance. Your available balance is $${wallet.availableWithdrawableBalance}. Escrow-locked pending funds ($${wallet.escrowPendingAmount}) are not eligible for withdrawal until work is completed and approved.`,
    });
    return;
  }

  const fee = 0; // Configurable payout transaction fee
  const netPayout = withdrawAmount - fee;

  // Deduct from available balance immediately to prevent double-spending
  wallet.availableWithdrawableBalance = Math.round((wallet.availableWithdrawableBalance - withdrawAmount) * 100) / 100;
  wallet.totalWithdrawn = Math.round((wallet.totalWithdrawn + withdrawAmount) * 100) / 100;
  db.updateWallet(user.id, wallet);

  const withdrawal: Withdrawal = {
    id: crypto.randomUUID(),
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    amount: withdrawAmount,
    fee,
    netPayout,
    payoutMode,
    payoutDetails,
    status: 'COMPLETED', // Processed through simulated marketplace settlement rails
    transactionReference: `WTH-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    requestedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
  };

  db.addWithdrawal(withdrawal);

  // Notify User
  db.addNotification({
    id: crypto.randomUUID(),
    userId: user.id,
    title: 'Withdrawal Processed',
    message: `Your withdrawal of $${netPayout} to ${payoutMode} has been processed successfully (Ref: ${withdrawal.transactionReference}).`,
    type: 'SUCCESS',
    link: user.role === 'TECH_PARTNER' ? '/tech/wallet' : '/partner/earnings',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  db.save();

  res.status(201).json({
    message: 'Withdrawal processed successfully to your destination account.',
    withdrawal,
    updatedWithdrawableBalance: wallet.availableWithdrawableBalance,
  });
});

export default router;
