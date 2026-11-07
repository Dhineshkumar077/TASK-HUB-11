import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  AlertCircle,
  DollarSign,
  ArrowLeft,
  ShieldCheck,
  UserX,
  Sparkles,
  Navigation,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { Gig, GigApplication, GigAttendance } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';
import { RouteDirectionsModal } from '../../components/RouteDirectionsModal.tsx';

interface ManageGigsProps {
  gigId: string;
  navigate: (path: string) => void;
}

export const ManageGigs: React.FC<ManageGigsProps> = ({ gigId, navigate }) => {
  const { lastEvent } = useRealtime();
  const [gig, setGig] = useState<Gig | null>(null);
  const [applications, setApplications] = useState<GigApplication[]>([]);
  const [attendance, setAttendance] = useState<GigAttendance[]>([]);
  const [waitlist, setWaitlist] = useState<GigApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false);

  const loadGigDetails = async () => {
    try {
      const res = await api.getGigById(gigId);
      setGig(res.gig);
      setApplications(res.applications || []);
      setAttendance(res.attendance || []);
      setWaitlist(res.waitlist || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load gig details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGigDetails();
  }, [gigId, lastEvent?.timestamp]);

  const handleApproveApplicant = async (appId: string) => {
    setError(null);
    try {
      await api.approveApplicant(gigId, appId);
      setActionMessage('Applicant approved successfully and slot reserved.');
      loadGigDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to approve applicant.');
    }
  };

  const handleRejectApplicant = async (appId: string) => {
    setError(null);
    try {
      await api.rejectApplicant(gigId, appId);
      setActionMessage('Applicant rejected.');
      loadGigDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to reject applicant.');
    }
  };

  const handleCancelWorker = async (partnerId: string) => {
    setError(null);
    if (!window.confirm('Cancel this worker assignment? If applicants exist on the waiting list, the next candidate will be automatically promoted.')) {
      return;
    }

    try {
      const res = await api.cancelWorker(gigId, partnerId);
      setActionMessage(res.message);
      loadGigDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel worker.');
    }
  };

  const handleApproveWork = async (partnerId: string) => {
    setError(null);
    try {
      const res = await api.approveGigWork(gigId, partnerId);
      setActionMessage(res.message);
      loadGigDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to approve work & release payment.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-400">
        Loading gig applications and attendance ledger...
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-rose-400">
        Gig record not found.
      </div>
    );
  }

  const confirmedApps = applications.filter((a) => a.status === 'APPROVED');
  const pendingApps = applications.filter((a) => a.status === 'PENDING' && !a.isWaitlisted);
  const isFilled = (gig.confirmedWorkers || 0) >= gig.requiredWorkers;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/host/dashboard')}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Host Dashboard
        </button>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Status:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
            {gig.status}
          </span>
        </div>
      </div>

      {/* Gig Header Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 uppercase font-bold tracking-wider">
              {gig.category === 'Others' ? gig.customCategory : gig.category}
            </span>
            <h1 className="text-2xl font-black text-white mt-2">{gig.title}</h1>
            <p className="text-xs text-slate-400 mt-1">{gig.fullAddress}</p>
            <div className="pt-2">
              <button
                onClick={() => setIsRoutingModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>View Location / Get Directions</span>
              </button>
            </div>
          </div>

          {/* Railway-style Status Display */}
          <div className="text-right sm:text-right bg-slate-950 p-4 rounded-2xl border border-slate-800 shrink-0">
            <div className="text-xs text-slate-400">Confirmed Slots</div>
            <div className="text-2xl font-mono font-black text-white">
              {gig.confirmedWorkers} / {gig.requiredWorkers}
            </div>
            <div className={`text-[11px] font-semibold ${isFilled ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isFilled ? 'Positions Filled (Waitlist Active)' : 'Open Positions Available'}
            </div>
          </div>
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

      {/* SECTION 1: Confirmed Workers & Attendance Management */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          Confirmed Workers & Geofenced Attendance
        </h2>

        {confirmedApps.length === 0 ? (
          <EmptyState
            title="No Confirmed Workers Yet"
            description="When applicants apply and you approve their application, they will appear here with live on-site check-in and check-out tracking."
          />
        ) : (
          <div className="space-y-3">
            {confirmedApps.map((app) => {
              const att = attendance.find((a) => a.partnerId === app.partnerId);
              return (
                <div
                  key={app.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{app.partnerName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        CONFIRMED
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {app.partnerMobile} • {app.partnerEmail}
                    </div>

                    {/* Attendance Details */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                      <span className="text-slate-400">Check-In:</span>
                      <strong className="text-white font-mono">
                        {att?.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending Arrival'}
                      </strong>
                      {att?.distanceCheckInMeters !== undefined && (
                        <span className="text-[11px] text-emerald-400 font-mono">
                          ({att.distanceCheckInMeters}m from site)
                        </span>
                      )}

                      <span className="text-slate-400 ml-2">Check-Out:</span>
                      <strong className="text-white font-mono">
                        {att?.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Approve Work & Release Payment */}
                    {att?.status === 'CHECKED_OUT' && !att.hostApproved ? (
                      <button
                        onClick={() => handleApproveWork(app.partnerId)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Approve Work & Release Pay
                      </button>
                    ) : att?.hostApproved ? (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                        Payment Released
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 italic">
                        {att?.status === 'CHECKED_IN' ? 'Shift In Progress' : 'Awaiting Check-In'}
                      </span>
                    )}

                    {/* Cancel worker assignment button */}
                    <button
                      onClick={() => handleCancelWorker(app.partnerId)}
                      className="p-2 rounded-xl border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition"
                      title="Cancel Assignment (Auto-promotes waitlist)"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Pending Applications */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          Pending Applicant Approvals
        </h2>

        {pendingApps.length === 0 ? (
          <EmptyState
            title="No Pending Applications"
            description="All candidate submissions have been reviewed, or new applicants will appear as they apply."
          />
        ) : (
          <div className="space-y-3">
            {pendingApps.map((app) => (
              <div
                key={app.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="font-bold text-white text-sm">{app.partnerName}</div>
                  <div className="text-xs text-slate-400 font-mono">
                    {app.partnerMobile} • Applied {new Date(app.appliedAt).toLocaleDateString()}
                  </div>
                  {app.notes && <div className="text-xs text-slate-300 mt-1 italic">"{app.notes}"</div>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveApplicant(app.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                  >
                    Approve Slot
                  </button>
                  <button
                    onClick={() => handleRejectApplicant(app.id)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Railway-Style Waiting List Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Railway-Style Reserved Waiting List Queue
          </h2>
          <span className="text-xs font-mono text-amber-400">
            {waitlist.length} Candidate(s) in Queue
          </span>
        </div>

        {waitlist.length === 0 ? (
          <EmptyState
            title="Waiting List is Empty"
            description="When all confirmed positions are filled, any additional eligible applicants automatically join this queue with sequential queue numbers (#1, #2...)."
          />
        ) : (
          <div className="space-y-2">
            {waitlist.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold flex items-center justify-center text-xs">
                    #{item.waitlistPosition}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{item.partnerName}</div>
                    <div className="text-xs text-slate-400 font-mono">
                      {item.partnerMobile} • Position #{item.waitlistPosition} in queue
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Auto-Promotes Upon Slot Opening
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {gig && (
        <RouteDirectionsModal
          isOpen={isRoutingModalOpen}
          onClose={() => setIsRoutingModalOpen(false)}
          destination={{
            id: gig.id,
            title: gig.title,
            fullAddress: gig.fullAddress,
            workLocation: gig.workLocation,
            lat: gig.latitude,
            lng: gig.longitude,
            hostName: gig.hostName,
            category: gig.category,
            paymentAmount: gig.paymentAmount,
            paymentBasis: gig.paymentBasis,
          }}
        />
      )}
    </div>
  );
};
