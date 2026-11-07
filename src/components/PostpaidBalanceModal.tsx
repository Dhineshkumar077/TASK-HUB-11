import React, { useState } from 'react';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  AlertCircle,
  X,
  CheckCircle,
  DollarSign,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { ServiceBooking } from '../types.ts';

interface PostpaidBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: ServiceBooking;
  onSuccess: (updatedBooking: ServiceBooking) => void;
}

export const PostpaidBalanceModal: React.FC<PostpaidBalanceModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [autoApproveWork, setAutoApproveWork] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const balanceAmount = booking.postpaidBalanceAmount || 0;

  const handlePayBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const ref = paymentMethod === 'UPI' ? upiId.trim() || undefined : undefined;
      const res = await api.payBookingBalance(booking.id, {
        paymentMethod,
        paymentReference: ref,
      });

      let finalBooking = res.booking;

      // If user opted to also approve work completion and release full escrow simultaneously
      if (autoApproveWork) {
        try {
          const appRes = await api.approveBooking(booking.id);
          if (appRes.booking) {
            finalBooking = appRes.booking;
          }
        } catch (appErr: any) {
          console.warn('Auto approval warning:', appErr.message);
        }
      }

      onSuccess(finalBooking);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process balance top-up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/30 max-w-md w-full rounded-3xl shadow-2xl overflow-hidden relative my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Shift Extension Balance Top-Up</h3>
              <p className="text-xs text-slate-400">Clear authorized on-site extension to release escrow</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePayBalance} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Balance Breakdown Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400">
                  {booking.extensionChoice === 'SHIFT_EXTENSION' ? 'Full-Day Shift Extension' : 'Hourly Overtime Extension'}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">{booking.serviceTitle}</h4>
                <div className="text-xs text-slate-400 mt-0.5">Technician: {booking.techPartnerName}</div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Postpaid Balance Due</span>
                <span className="text-xl font-black font-mono text-amber-400">
                  ₹{balanceAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Time Logs Audit Display */}
            {booking.checkInTime && booking.checkOutTime && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Check-In (Job Start):</span>
                  <span className="font-mono text-white">{new Date(booking.checkInTime).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Check-Out (Job End):</span>
                  <span className="font-mono text-white">{new Date(booking.checkOutTime).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between text-cyan-300 font-semibold pt-1 border-t border-slate-800/60">
                  <span>Logged Duration:</span>
                  <span className="font-mono">{booking.loggedDurationHours ?? 4} hrs</span>
                </div>
              </div>
            )}

            {/* Specific Extension Calculation Breakdown */}
            {booking.extensionChoice === 'EXTRA_HOURS' ? (
              <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200/90 space-y-1">
                <div className="flex justify-between">
                  <span>Extra Hours Worked:</span>
                  <span className="font-mono font-bold text-white">+{booking.extraHoursWorked ?? booking.overtimeHours ?? 1} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Technician Defined Rate:</span>
                  <span className="font-mono text-white">₹{booking.customHourlyRate ?? booking.hourlyRate ?? 250}/hr</span>
                </div>
                <div className="flex justify-between text-amber-300 font-bold pt-1 border-t border-amber-500/20">
                  <span>Overtime Wage:</span>
                  <span className="font-mono">₹{booking.overtimeAmount ?? 250}</span>
                </div>
              </div>
            ) : booking.extensionChoice === 'SHIFT_EXTENSION' ? (
              <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-[11px] text-cyan-200/90 space-y-1">
                <div className="flex justify-between">
                  <span>Initial Half-Day Base (Escrowed):</span>
                  <span className="font-mono text-emerald-400">₹{booking.halfDayPrice || booking.servicePrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Upgraded Full-Day Rate:</span>
                  <span className="font-mono text-white">₹{booking.fullDayPrice || Math.round(booking.servicePrice * 1.8)}</span>
                </div>
                <div className="flex justify-between text-cyan-300 font-bold pt-1 border-t border-cyan-500/20">
                  <span>Remaining Wage Difference:</span>
                  <span className="font-mono">₹{booking.overtimeAmount}</span>
                </div>
              </div>
            ) : null}

            {booking.extensionReason && (
              <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 italic">
                Reason from technician: "{booking.extensionReason}"
              </div>
            )}

            {booking.workNotes && (
              <div className="text-[11px] text-slate-400 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                Work notes: "{booking.workNotes}"
              </div>
            )}

            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
              <span>Baseline Escrow Already Deposited:</span>
              <span className="font-mono text-emerald-400">₹{booking.baseEscrowAmount || booking.servicePrice}</span>
            </div>
          </div>

          {/* Payment Rail Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'UPI', label: 'UPI / QR Code', icon: QrCode },
                { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
                { id: 'DEBIT_CARD', label: 'Debit Card', icon: CreditCard },
                { id: 'NET_BANKING', label: 'Net Banking', icon: ShieldCheck },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    paymentMethod === m.id
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <m.icon className="w-4 h-4 text-amber-400" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'UPI' && (
            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400">Enter UPI ID / VPA</label>
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. user@okaxis"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && (
            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400">Card Number</label>
              <input
                type="text"
                required
                maxLength={19}
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4111 •••• •••• 1111"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Auto-Approval & Escrow Policy */}
          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-amber-500/50 transition">
              <input
                type="checkbox"
                checked={autoApproveWork}
                onChange={(e) => setAutoApproveWork(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500/30"
              />
              <span>
                <strong className="text-white block font-semibold">Also approve completed work & release escrow immediately</strong>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  If checked, paying clears the balance and immediately releases the combined escrow (₹{((booking.baseEscrowAmount || booking.servicePrice) + (booking.overtimeAmount || balanceAmount)).toFixed(2)}) to {booking.techPartnerName}'s withdrawable wallet.
                </span>
              </span>
            </label>

            <div className="text-[11px] text-amber-200/90 p-2.5 bg-amber-950/30 rounded-xl border border-amber-500/30 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Escrow Protection:</strong> Final payout to the technician remains securely locked in Escrow until you review the time logs, approve the extension, and clear this postpaid balance payment.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xl shadow-amber-600/30 cursor-pointer"
            >
              {isSubmitting ? (
                'Processing Postpaid Escrow Deposit...'
              ) : (
                <>
                  <span>Pay Balance ₹{balanceAmount.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
