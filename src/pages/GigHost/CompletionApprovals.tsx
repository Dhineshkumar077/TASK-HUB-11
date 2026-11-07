import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  AlertCircle,
  DollarSign,
  ArrowLeft,
  ShieldCheck,
  Users,
  User,
  Sparkles,
  Lock,
  Unlock,
  Navigation,
  FileText,
  Building,
  Check,
  X,
  CreditCard,
  Landmark,
  Star,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { GigApprovalItem } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';
import { SubmitReviewModal } from '../../components/SubmitReviewModal.tsx';

interface CompletionApprovalsProps {
  navigate: (path: string) => void;
}

export const CompletionApprovals: React.FC<CompletionApprovalsProps> = ({ navigate }) => {
  const { lastEvent } = useRealtime();
  const [approvals, setApprovals] = useState<GigApprovalItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reject modal
  const [rejectingItem, setRejectingItem] = useState<GigApprovalItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Dynamic Counter-Party Review Modal
  const [reviewingItem, setReviewingItem] = useState<GigApprovalItem | null>(null);

  const loadApprovals = async () => {
    try {
      const res = await api.getHostApprovals();
      setApprovals(res.approvals || []);
    } catch (err: any) {
      console.error('Failed to load host approvals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [lastEvent?.timestamp]);

  const handleApproveEscrowRelease = async (item: GigApprovalItem) => {
    setErrorMessage(null);
    setActionMessage(null);
    setIsSubmittingAction(true);

    try {
      const res = await api.approveGigWork(item.gigId, item.partnerId);
      setActionMessage(res.message || 'Work approved and escrow successfully released!');
      loadApprovals();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve completion & release escrow.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    if (!rejectionReason.trim()) {
      setErrorMessage('Please provide a specific rejection reason.');
      return;
    }

    setErrorMessage(null);
    setActionMessage(null);
    setIsSubmittingAction(true);

    try {
      await api.rejectGigWork(rejectingItem.gigId, {
        partnerId: rejectingItem.partnerId,
        reason: rejectionReason.trim(),
      });
      setActionMessage('Work request rejected and feedback dispatched to partner.');
      setRejectingItem(null);
      setRejectionReason('');
      loadApprovals();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reject work submission.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING_APPROVAL');
  const approvedApprovals = approvals.filter((a) => a.status === 'APPROVED');
  const rejectedApprovals = approvals.filter((a) => a.status === 'REJECTED');

  const filteredItems = approvals.filter((item) => {
    if (filter === 'PENDING') return item.status === 'PENDING_APPROVAL';
    if (filter === 'APPROVED') return item.status === 'APPROVED';
    if (filter === 'REJECTED') return item.status === 'REJECTED';
    return true;
  });

  const totalEscrowPending = pendingApprovals.reduce(
    (acc, item) => acc + (item.consolidatedPayoutAmount || item.paymentAmount || 0),
    0
  );
  const totalEscrowReleased = approvedApprovals.reduce(
    (acc, item) => acc + (item.consolidatedPayoutAmount || item.paymentAmount || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/host/dashboard')}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Host Dashboard
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Completion Approvals & Escrow Release
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold">
              Secure Escrow Vault
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review physical on-site check-in logs, departure timestamps, and release locked escrow payments to workers and referral gangs.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Pending Inspections
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            {pendingApprovals.length}
          </div>
          <div className="text-[11px] text-slate-500">Awaiting your approval</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Escrow Locked In Vault
          </span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
            ₹{totalEscrowPending.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Held securely until release</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Released Escrow
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            ₹{totalEscrowReleased.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Paid to partners & gangs</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Approved Shifts
          </span>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400">
            {approvedApprovals.length}
          </div>
          <div className="text-[11px] text-slate-500">{rejectedApprovals.length} rejected</div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            filter === 'PENDING'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Pending Inspection</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono">
            {pendingApprovals.length}
          </span>
        </button>

        <button
          onClick={() => setFilter('APPROVED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            filter === 'APPROVED'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Escrow Released</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono">
            {approvedApprovals.length}
          </span>
        </button>

        <button
          onClick={() => setFilter('REJECTED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            filter === 'REJECTED'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Rejected</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono">
            {rejectedApprovals.length}
          </span>
        </button>

        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            filter === 'ALL'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All ({approvals.length})
        </button>
      </div>

      {/* Approvals List */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400 text-sm animate-pulse">
          Loading completion inspection requests from database...
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={
            filter === 'PENDING'
              ? 'Zero Pending Completion Approvals'
              : 'No Records Match Filter'
          }
          description="When workers complete their on-site shift and execute 'Work Done → Check-Out', their verified timestamps and work logs appear here for your review and escrow release."
          actionText="View Active Gigs"
          onAction={() => navigate('/host/dashboard')}
        />
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isGang = item.bookingType === 'REFERRAL_GANG';
            const workerCount = isGang ? (item.gangCount || 1) : 1;
            const payoutAmount = item.consolidatedPayoutAmount || item.paymentAmount * workerCount;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl hover:border-slate-700 transition"
              >
                {/* Header: Title, Gang badge, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white text-base">
                        {item.gigTitle}
                      </span>
                      {isGang ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                          <Users className="w-3.5 h-3.5" />
                          Referral Gang: {item.gangName} ({workerCount} Workers)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-semibold">
                          <User className="w-3 h-3" />
                          Individual Worker
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{item.workLocation}</span>
                      <span className="text-slate-600">•</span>
                      <span>Worker: <strong className="text-slate-200">{item.partnerName}</strong></span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 flex items-center gap-2">
                    {item.status === 'PENDING_APPROVAL' && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        Awaiting Inspection
                      </span>
                    )}
                    {item.status === 'APPROVED' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Escrow Released
                      </span>
                    )}
                    {item.status === 'REJECTED' && (
                      <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrival & Departure Log Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs">
                  {/* Arrival / Check-in */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium block">
                      {isGang ? 'Unified Gang Arrival (Check-In)' : 'Worker Arrival (Check-In)'}
                    </span>
                    <div className="text-white font-mono font-bold">
                      {item.checkInTime ? new Date(item.checkInTime).toLocaleString() : 'Not recorded'}
                    </div>
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      GPS Validated ({item.distanceCheckInMeters ?? 5}m from site)
                    </div>
                  </div>

                  {/* Departure / Check-out */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium block">
                      {isGang ? 'Unified Gang Departure (Check-Out)' : 'Work Completion (Check-Out)'}
                    </span>
                    <div className="text-white font-mono font-bold">
                      {item.checkOutTime ? new Date(item.checkOutTime).toLocaleString() : 'Pending'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Claimed Duration: <strong className="text-slate-200">{item.claimedDuration || 'Full Shift'}</strong>
                    </div>
                  </div>

                  {/* Payout & Escrow Reserve */}
                  <div className="space-y-1 md:text-right">
                    <span className="text-slate-500 font-medium block">
                      {isGang ? `Consolidated Escrow (${workerCount} Workers)` : 'Individual Escrow Amount'}
                    </span>
                    <div className="text-emerald-400 font-mono font-black text-base">
                      ₹{payoutAmount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isGang
                        ? `₹${item.paymentAmount} × ${workerCount} workers`
                        : `${item.paymentBasis}`}
                    </div>
                  </div>
                </div>

                {/* Gang Members List & Designated Payout Details */}
                {isGang && (
                  <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-indigo-300">
                        Designated Bank / Payout Account for Consolidated Escrow:
                      </span>
                      {item.designatedPayoutAccount?.upiId ? (
                        <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          UPI: {item.designatedPayoutAccount.upiId}
                        </span>
                      ) : item.designatedPayoutAccount?.bankAccount ? (
                        <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          A/C: {item.designatedPayoutAccount.bankAccount} (IFSC: {item.designatedPayoutAccount.ifsc})
                        </span>
                      ) : (
                        <span className="text-slate-400">Leader Wallet</span>
                      )}
                    </div>

                    {item.gangMembers && item.gangMembers.length > 0 && (
                      <div className="text-[11px] text-slate-400 flex flex-wrap gap-2 pt-1 border-t border-indigo-500/20">
                        <span className="text-slate-500">Gang Members:</span>
                        {item.gangMembers.map((m, idx) => (
                          <span key={idx} className="bg-slate-900 px-2 py-0.5 rounded text-slate-300 font-medium">
                            {m.name} {m.mobile ? `(${m.mobile})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Work Notes */}
                {item.workNotes && (
                  <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-start gap-2">
                    <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-300">Worker Log / Notes: </strong>
                      <span>{item.workNotes}</span>
                    </div>
                  </div>
                )}

                {item.rejectionReason && (
                  <div className="text-xs text-rose-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Rejection Note: </strong>
                      <span>{item.rejectionReason}</span>
                    </div>
                  </div>
                )}

                {/* Action Footer */}
                {item.status === 'PENDING_APPROVAL' && (
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setRejectingItem(item)}
                      disabled={isSubmittingAction}
                      className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition cursor-pointer"
                    >
                      Reject Work
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApproveEscrowRelease(item)}
                      disabled={isSubmittingAction}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Approve Completion & Release Escrow (₹{payoutAmount.toLocaleString()})</span>
                    </button>
                  </div>
                )}

                {item.status === 'APPROVED' && (
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Work Approved & Escrow Released
                    </span>
                    <button
                      type="button"
                      onClick={() => setReviewingItem(item)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Rate & Review Gig Partner</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                Reject Work Completion
              </h3>
              <button onClick={() => setRejectingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Please state why the work for <strong>"{rejectingItem.gigTitle}"</strong> by <strong>{rejectingItem.partnerName}</strong> does not meet the agreed requirements.
            </p>

            <div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Worker left 2 hours early; packing tasks not completed."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 placeholder-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingAction || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Counter-Party Review Modal */}
      {reviewingItem && (
        <SubmitReviewModal
          isOpen={!!reviewingItem}
          onClose={() => setReviewingItem(null)}
          revieweeId={reviewingItem.partnerId}
          revieweeName={reviewingItem.partnerName}
          revieweeRole="GIG_PARTNER"
          division="MICRO_GIG"
          gigId={reviewingItem.gigId}
          jobTitle={reviewingItem.gigTitle}
          onReviewSubmitted={() => {
            setActionMessage('Your verified review for the Gig Partner was submitted and aggregated!');
            loadApprovals();
          }}
        />
      )}
    </div>
  );
};
