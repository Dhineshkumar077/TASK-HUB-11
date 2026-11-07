import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  ShieldCheck,
  FileText,
  User,
  ArrowLeft,
  XCircle,
  Sparkles,
  CreditCard,
  X,
  Compass,
  Star,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { ServiceBooking } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PostpaidBalanceModal } from '../../components/PostpaidBalanceModal.tsx';
import { SubmitReviewModal } from '../../components/SubmitReviewModal.tsx';

interface MyBookingsProps {
  navigate: (path: string) => void;
}

export const MyBookings: React.FC<MyBookingsProps> = ({ navigate }) => {
  const { lastEvent } = useRealtime();
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dispute Modal
  const [disputeBooking, setDisputeBooking] = useState<ServiceBooking | null>(null);
  const [disputeReason, setDisputeReason] = useState('Incomplete work');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  // Step 4 Postpaid Balance Modal
  const [balanceModalBooking, setBalanceModalBooking] = useState<ServiceBooking | null>(null);

  // Receipt Modal
  const [receiptBooking, setReceiptBooking] = useState<ServiceBooking | null>(null);

  // Dynamic Counter-Party Review Modal
  const [reviewModalBooking, setReviewModalBooking] = useState<ServiceBooking | null>(null);

  const loadBookings = async () => {
    try {
      const res = await api.getMyBookings();
      setBookings(res?.bookings || []);
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [lastEvent?.timestamp]);

  // Step 5: Final Work Approval & Escrow Release
  const handleApproveWork = async (bookingId: string) => {
    setError(null);
    setActionMessage(null);

    try {
      const res = await api.approveBooking(bookingId);
      setActionMessage(res.message);
      loadBookings();
    } catch (err: any) {
      setError(err.message || 'Failed to approve work.');
    }
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeBooking) return;
    setIsSubmittingDispute(true);
    setError(null);

    try {
      const res = await api.disputeBooking(disputeBooking.id, {
        reasonCategory: disputeReason,
        description: disputeDescription,
      });
      setActionMessage(res.message);
      setDisputeBooking(null);
      setDisputeDescription('');
      loadBookings();
    } catch (err: any) {
      setError(err.message || 'Failed to raise dispute.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/seeker/dashboard')}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Seeker Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Service Appointments & Escrow Releases
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track technician arrival, clear shift extension top-ups, inspect completed work, and approve Escrow release.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/seeker/map')}
            className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Compass className="w-3.5 h-3.5" />
            Radar Map (10-15 km)
          </button>
          <button
            onClick={() => navigate('/seeker/search')}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition"
          >
            Book Another Shift
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-slate-400 animate-pulse text-sm">
          Loading booking status and payment records...
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No Bookings Recorded"
          description="You haven't scheduled any service bookings yet. Discover qualified technicians within 10 to 15 km to schedule a shift."
          actionText="Find Local Services"
          onAction={() => navigate('/seeker/search')}
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 uppercase font-bold">
                    {b.category}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      b.customerApproved
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : b.status === 'AWAITING_BALANCE_TOPUP'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : b.paymentStatus === 'ESCROW_LOCKED'
                        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {b.customerApproved
                      ? 'WORK APPROVED & ESCROW RELEASED'
                      : b.status === 'AWAITING_BALANCE_TOPUP'
                      ? 'POSTPAID BALANCE PAYMENT REQUIRED'
                      : b.status}
                  </span>
                  {b.paymentStatus === 'ESCROW_LOCKED' && !b.customerApproved && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      ₹{b.baseEscrowAmount || b.servicePrice} Base Escrow Locked
                    </span>
                  )}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    Base Shift: {b.baseDurationHours || 4} hrs (₹{b.servicePrice})
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">{b.serviceTitle}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                    <span>Technician: <strong className="text-white">{b.techPartnerName}</strong></span>
                    {b.isContactUnlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[11px] border border-emerald-500/30">
                        📞 {b.techPartnerMobile} (Direct Unlocked)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px] border border-slate-700">
                        🔒 {b.techPartnerMobile} (Escrow Protected)
                      </span>
                    )}
                  </div>
                </div>

                {/* Date, Timing & Attendance details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Scheduled Date: <strong className="text-white font-mono">{b.serviceDate}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Preferred Start: <strong className="text-white font-mono">{b.preferredTime}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{b.serviceAddress}</span>
                  </div>

                  {/* On-Site GPS Timestamps & Geofenced Attendance */}
                  {b.checkInTime && (
                    <div className="col-span-2 text-xs bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-cyan-300">
                          <strong>Check-In (Job Start):</strong> {new Date(b.checkInTime).toLocaleTimeString()} ({b.checkInDistanceMeters ?? 0}m GPS on-site verified)
                        </span>
                        {b.checkOutTime ? (
                          <span className="text-emerald-300 font-semibold">
                            <strong>Check-Out (Job End):</strong> {new Date(b.checkOutTime).toLocaleTimeString()} ({b.loggedDurationHours ?? b.baseDurationHours} hrs duration logged)
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold animate-pulse">
                            ● Job In Progress on Site
                          </span>
                        )}
                      </div>
                      {b.workNotes && (
                        <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                          <strong>Technician Notes:</strong> {b.workNotes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4 Shift Extension / Overtime Review & Balance Alert Box */}
                  {b.isExtended && (
                    <div className="col-span-2 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-amber-300 flex items-center gap-1.5 text-xs font-bold">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          {b.extensionChoice === 'SHIFT_EXTENSION'
                            ? 'Full-Day Shift Extension Requested by Tech'
                            : `Hourly Overtime Logged (+${b.extraHoursWorked ?? b.overtimeHours ?? 1} hrs @ ₹${b.customHourlyRate ?? b.hourlyRate ?? 250}/hr)`}
                        </strong>
                        <span className="font-mono font-bold text-amber-300 text-sm">
                          +₹{b.postpaidBalanceAmount} Postpaid Balance
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/90">
                        {b.extensionReason || 'Technician completed additional work requiring shift extension / overtime.'}
                      </p>

                      {/* Escrow payout lock notification */}
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-[11px] flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block font-semibold">Technician Escrow Payout is Locked</strong>
                          <span className="text-slate-300">
                            The base escrow (₹{b.baseEscrowAmount || b.servicePrice}) and postpaid extension payout to {b.techPartnerName}'s wallet remain locked in escrow until you review the time logs, approve the extension, and clear this postpaid balance payment.
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] font-semibold pt-1 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                        <span>Postpaid Payment Status:</span>
                        {b.postpaidBalancePaid ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Postpaid Balance Cleared & Locked in Escrow
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold animate-pulse">
                            Payment Required to Unlock Work Completion Approval
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Standard Completion Notification */}
                  {b.checkOutTime && !b.isExtended && !b.customerApproved && (
                    <div className="col-span-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span><strong>Standard Completion:</strong> Work concluded within scheduled {b.baseDurationHours || 4} hrs shift. No extension or overtime requested.</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 shrink-0">₹{b.servicePrice} Base Escrow</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 min-w-[220px]">
                {/* Step 4: Balance Top-Up Action Button if extended and unpaid */}
                {b.isExtended && !b.postpaidBalancePaid && (
                  <button
                    onClick={() => setBalanceModalBooking(b)}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition shadow flex items-center justify-center gap-2 cursor-pointer shadow-amber-600/30 animate-pulse text-center"
                  >
                    <CreditCard className="w-4 h-4" />
                    Review Logs & Pay Balance (₹{b.postpaidBalanceAmount})
                  </button>
                )}

                {/* Step 5: Final Approval & Escrow Release Button */}
                {b.checkOutTime && !b.customerApproved && (!b.isExtended || b.postpaidBalancePaid) && (
                  <button
                    onClick={() => handleApproveWork(b.id)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow flex items-center justify-center gap-2 cursor-pointer shadow-emerald-600/30 text-center"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Completed Work & Release Escrow
                  </button>
                )}

                {b.checkOutTime && !b.customerApproved && b.isExtended && !b.postpaidBalancePaid && (
                  <div className="px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-400 text-[11px] text-center font-medium">
                    Payout locked • Clear postpaid balance to approve
                  </div>
                )}

                {b.customerApproved ? (
                  <div className="space-y-2">
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center font-bold">
                      Escrow Released to Tech
                    </div>
                    <button
                      onClick={() => setReviewModalBooking(b)}
                      className="w-full px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-slate-950" />
                      Rate & Review Tech Partner
                    </button>
                  </div>
                ) : !b.checkOutTime ? (
                  <div className="text-xs text-slate-500 text-center italic py-1">
                    {b.checkInTime ? 'Shift In Progress' : 'Awaiting Shift Date'}
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReceiptBooking(b)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Receipt
                  </button>

                  {!b.customerApproved && b.status !== 'DISPUTED' && (
                    <button
                      onClick={() => setDisputeBooking(b)}
                      className="py-2 px-3 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1 transition"
                      title="Raise a Dispute to halt escrow"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Dispute
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 4 Postpaid Balance Modal */}
      {balanceModalBooking && (
        <PostpaidBalanceModal
          isOpen={!!balanceModalBooking}
          onClose={() => setBalanceModalBooking(null)}
          booking={balanceModalBooking}
          onSuccess={(updated) => {
            setActionMessage(`Postpaid balance top-up of $${updated.postpaidBalanceAmount} completed! You can now inspect and approve work.`);
            setBalanceModalBooking(null);
            loadBookings();
          }}
        />
      )}

      {/* Receipt Modal */}
      {receiptBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Escrow Payment Receipt</h3>
              </div>
              <button
                onClick={() => setReceiptBooking(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Booking Ref:</span>
                <span className="font-mono text-white font-bold">{receiptBooking.id.slice(0, 12)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Service Title:</span>
                <span className="text-white font-semibold">{receiptBooking.serviceTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Category:</span>
                <span className="text-cyan-400 font-mono">{receiptBooking.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Shift Tier:</span>
                <span className="text-white">{receiptBooking.shiftType || 'Shift Booking'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Base Shift Rate:</span>
                <span className="font-mono text-white">${receiptBooking.servicePrice}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Platform Commission (8%):</span>
                <span className="font-mono text-slate-400">${receiptBooking.platformFee ?? Math.round(receiptBooking.servicePrice * 0.08 * 100) / 100}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Taxes (18% on fee):</span>
                <span className="font-mono text-slate-400">${receiptBooking.applicableTaxes ?? Math.round((receiptBooking.servicePrice * 0.08 * 0.18) * 100) / 100}</span>
              </div>
              {receiptBooking.isExtended && receiptBooking.postpaidBalanceAmount ? (
                <div className="flex justify-between py-1 border-b border-slate-800/60 text-amber-300">
                  <span>Shift Extension Top-up:</span>
                  <span className="font-mono">+${receiptBooking.postpaidBalanceAmount} ({receiptBooking.postpaidBalancePaid ? 'Paid' : 'Pending'})</span>
                </div>
              ) : null}
              <div className="flex justify-between py-2 border-t border-slate-700 text-sm font-bold">
                <span className="text-white">Total Amount:</span>
                <span className="font-mono text-emerald-400">${receiptBooking.totalPayableAmount}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setReceiptBooking(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Halt Escrow Release</h3>
              </div>
              <button
                onClick={() => setDisputeBooking(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Reason for Dispute
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Incomplete work">Incomplete work</option>
                  <option value="Damaged equipment or property">Damaged equipment or property</option>
                  <option value="Technician did not show up">Technician did not show up</option>
                  <option value="Poor quality of service">Poor quality of service</option>
                  <option value="Overcharging / unexpected extra fee">Overcharging / unexpected extra fee</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Incident Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Describe what occurred on-site so Admin can arbitrate..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDisputeBooking(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition"
                >
                  Confirm Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Counter-Party Review Modal */}
      {reviewModalBooking && (
        <SubmitReviewModal
          isOpen={!!reviewModalBooking}
          onClose={() => setReviewModalBooking(null)}
          revieweeId={reviewModalBooking.techPartnerId}
          revieweeName={reviewModalBooking.techPartnerName}
          revieweeRole="TECH_PARTNER"
          division="LOCAL_SERVICE"
          bookingId={reviewModalBooking.id}
          jobTitle={reviewModalBooking.serviceTitle}
          onReviewSubmitted={() => {
            setActionMessage('Your verified review was submitted! The arithmetic mean and star distribution have been updated in real-time.');
            loadBookings();
          }}
        />
      )}
    </div>
  );
};
