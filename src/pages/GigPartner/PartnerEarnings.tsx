import React, { useState, useEffect } from 'react';
import {
  Wallet,
  DollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';

interface PartnerEarningsProps {
  navigate: (path: string) => void;
}

export const PartnerEarnings: React.FC<PartnerEarningsProps> = ({ navigate }) => {
  const { lastEvent } = useRealtime();
  const [walletData, setWalletData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Payout request modal
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMode, setPayoutMode] = useState('UPI');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = async () => {
    try {
      const res = await api.getMyWallet();
      setWalletData(res);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [lastEvent?.timestamp]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const res = await api.withdrawFunds({
        amount: parseFloat(withdrawAmount),
        payoutMode,
        payoutDetails,
      });
      setMessage(res.message);
      setIsWithdrawOpen(false);
      setWithdrawAmount('');
      setPayoutDetails('');
      loadWallet();
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-400 animate-pulse text-sm">
        Retrieving verified ledger and wallet balances...
      </div>
    );
  }

  const wallet1 = walletData?.wallet1Earnings || {};
  const wallet2 = walletData?.wallet2Withdrawals || {};
  const transactions = wallet1?.transactions || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Escrow-Verified Earnings & Settlement Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Partner Wallet & Compensation
          </h1>
        </div>

        <button
          onClick={() => setIsWithdrawOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/30 flex items-center gap-2 self-start sm:self-auto"
        >
          <ArrowUpRight className="w-4 h-4" />
          Request Payout / Withdrawal
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Accounting Balances Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Available Withdrawable Balance
          </span>
          <div className="text-3xl font-mono font-black text-emerald-400">
            ${wallet2.availableWithdrawableBalance ? wallet2.availableWithdrawableBalance.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">Eligible for instant withdrawal</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Pending in Escrow
          </span>
          <div className="text-3xl font-mono font-black text-indigo-400">
            ${wallet1.escrowPendingAmount ? wallet1.escrowPendingAmount.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">Strictly locked until work approval</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Total Withdrawn Payouts
          </span>
          <div className="text-3xl font-mono font-black text-white">
            ${wallet2.totalWithdrawn ? wallet2.totalWithdrawn.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">Processed to bank/UPI</div>
        </div>
      </div>

      {/* Transactions & Escrow Releases */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          Financial Settlement Ledger
        </h2>

        {transactions.length === 0 ? (
          <EmptyState
            title="No Completed Settlements Yet"
            description="When you complete shifts and hosts approve your work, verified payment releases and platform fee deductions will appear in this ledger."
          />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Job Description</th>
                    <th className="py-3 px-4">Gross Amount</th>
                    <th className="py-3 px-4">Platform Fee</th>
                    <th className="py-3 px-4">Net Received</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-300 font-semibold">{tx.transactionId}</td>
                      <td className="py-3 px-4 text-white font-sans font-medium">{tx.title}</td>
                      <td className="py-3 px-4 text-slate-400">${tx.grossAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-rose-400">-${tx.platformFee.toFixed(2)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">${tx.netPartnerAmount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                          {tx.escrowStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-lg font-bold text-white">Request Payout to Bank or UPI</h3>
            <p className="text-xs text-slate-300">
              Available Withdrawable Balance: <strong className="text-emerald-400 font-mono">${wallet2.availableWithdrawableBalance?.toFixed(2) || '0.00'}</strong>
            </p>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Amount to Withdraw ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  max={wallet2.availableWithdrawableBalance || 0}
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="e.g. 50.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Payout Method
                </label>
                <select
                  value={payoutMode}
                  onChange={(e) => setPayoutMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="UPI">UPI ID / VPA</option>
                  <option value="Bank Account">Direct Bank Transfer (IMPS / ACH)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Destination Account Details
                </label>
                <input
                  type="text"
                  required
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  placeholder={payoutMode === 'UPI' ? 'e.g. yourname@okhdfcbank' : 'e.g. Account Number & Routing / IFSC'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !withdrawAmount}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
