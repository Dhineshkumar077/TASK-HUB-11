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
  Lock,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';

interface DualWalletProps {
  navigate: (path: string) => void;
}

export const DualWallet: React.FC<DualWalletProps> = ({ navigate }) => {
  const { lastEvent } = useRealtime();
  const [activeTab, setActiveTab] = useState<'wallet1' | 'wallet2'>('wallet1');
  const [walletData, setWalletData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Payout request
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
      console.error('Failed to load dual wallet:', err);
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
        Retrieving dual accounting ledgers...
      </div>
    );
  }

  const wallet1 = walletData?.wallet1Earnings || {};
  const wallet2 = walletData?.wallet2Withdrawals || {};
  const transactions = wallet1?.transactions || [];
  const withdrawals = wallet2?.withdrawals || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Module 5.7 Dual-Ledger Architecture
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Tech Partner Dual Wallet System
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Strict separation between Gross Revenue & Pending Escrow Funds vs. Available Withdrawable Balances.
          </p>
        </div>

        <button
          onClick={() => setIsWithdrawOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/30 flex items-center gap-2 self-start sm:self-auto"
        >
          <ArrowUpRight className="w-4 h-4" />
          Request Payout
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

      {/* Accounting Views Switcher */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('wallet1')}
          className={`pb-4 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'wallet1'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Lock className="w-4 h-4" />
          Wallet 1: Earnings & Pending Funds
        </button>
        <button
          onClick={() => setActiveTab('wallet2')}
          className={`pb-4 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'wallet2'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Wallet 2: Available Withdrawal Balance
        </button>
      </div>

      {/* VIEW 1: Earnings and Pending Funds */}
      {activeTab === 'wallet1' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Gross Service Revenue
              </span>
              <div className="text-3xl font-mono font-black text-white">
                ${wallet1.grossEarnings ? wallet1.grossEarnings.toFixed(2) : '0.00'}
              </div>
              <div className="text-[11px] text-slate-500">Total customer-paid bookings</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Escrow-Locked Pending
              </span>
              <div className="text-3xl font-mono font-black text-indigo-400">
                ${wallet1.escrowPendingAmount ? wallet1.escrowPendingAmount.toFixed(2) : '0.00'}
              </div>
              <div className="text-[11px] text-slate-500">Not eligible for withdrawal until approved</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Platform Fees Applied
              </span>
              <div className="text-3xl font-mono font-black text-rose-400">
                ${wallet1.totalPlatformFeesDeducted ? wallet1.totalPlatformFeesDeducted.toFixed(2) : '0.00'}
              </div>
              <div className="text-[11px] text-slate-500">Fixed 10% platform service fee</div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Service Earnings & Escrow Ledger
            </h3>

            {transactions.length === 0 ? (
              <EmptyState
                title="No Service Transactions Yet"
                description="When customers book your services and complete payment, confirmed escrow deposits and released amounts will be tracked line-by-line here."
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Transaction Reference</th>
                        <th className="py-3 px-4">Service</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Gross Total</th>
                        <th className="py-3 px-4">Net Partner</th>
                        <th className="py-3 px-4">Escrow Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {transactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 text-slate-300 font-semibold">{tx.transactionId}</td>
                          <td className="py-3 px-4 text-white font-sans">{tx.title}</td>
                          <td className="py-3 px-4 text-slate-300 font-sans">{tx.payerName}</td>
                          <td className="py-3 px-4 text-slate-400">${tx.grossAmount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">${tx.netPartnerAmount.toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              tx.escrowStatus === 'RELEASED_TO_PARTNER'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : tx.escrowStatus === 'ESCROW_LOCKED'
                                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
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
        </div>
      )}

      {/* VIEW 2: Available Withdrawal Balance */}
      {activeTab === 'wallet2' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Withdrawable Balance
              </span>
              <div className="text-3xl font-mono font-black text-emerald-400">
                ${wallet2.availableWithdrawableBalance ? wallet2.availableWithdrawableBalance.toFixed(2) : '0.00'}
              </div>
              <div className="text-[11px] text-slate-500">Available for immediate payout</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Total Payouts Settled
              </span>
              <div className="text-3xl font-mono font-black text-white">
                ${wallet2.totalWithdrawn ? wallet2.totalWithdrawn.toFixed(2) : '0.00'}
              </div>
              <div className="text-[11px] text-slate-500">{wallet2.completedWithdrawalsCount || 0} completed payouts</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Payout Fee Rate
              </span>
              <div className="text-3xl font-mono font-black text-cyan-400">$0.00</div>
              <div className="text-[11px] text-slate-500">Direct marketplace settlement</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                Withdrawal & Settlement Payout History
              </h3>
              <button
                onClick={() => setIsWithdrawOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                + New Withdrawal
              </button>
            </div>

            {withdrawals.length === 0 ? (
              <EmptyState
                title="No Withdrawal Requests Made"
                description="When you have an available balance from customer-approved work, you can submit a verified payout request to your bank account or UPI."
                actionText="Request First Withdrawal"
                onAction={() => setIsWithdrawOpen(true)}
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Payout Ref</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Destination Mode</th>
                        <th className="py-3 px-4">Destination Details</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Processed Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {withdrawals.map((w: any) => (
                        <tr key={w.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 text-slate-300 font-semibold">{w.transactionReference}</td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">${w.netPayout.toFixed(2)}</td>
                          <td className="py-3 px-4 text-white font-sans">{w.payoutMode}</td>
                          <td className="py-3 px-4 text-slate-400">{w.payoutDetails}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                              {w.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(w.requestedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdrawal Dialog */}
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
                  placeholder="e.g. 100.00"
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
                  <option value="UPI">UPI Virtual Payment Address</option>
                  <option value="Bank Account">Direct Bank Account (IMPS / ACH)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Verified Payout Destination
                </label>
                <input
                  type="text"
                  required
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  placeholder={payoutMode === 'UPI' ? 'e.g. techpro@upi' : 'Account Number & Bank Routing / IFSC'}
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
                  {isSubmitting ? 'Validating Balance...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
