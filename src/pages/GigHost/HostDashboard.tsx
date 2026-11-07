import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Clock,
  CheckCircle,
  PlusCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  Navigation,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  Building,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { api } from '../../services/api.ts';
import { Gig, GigApprovalItem } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';
import { RouteDirectionsModal } from '../../components/RouteDirectionsModal.tsx';
import { AdminBroadcastBanner } from '../../components/AdminBroadcastBanner.tsx';
import { HostTaskAlertCard } from '../../components/HostTaskAlertCard.tsx';

interface HostDashboardProps {
  navigate: (path: string) => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const { lastEvent } = useRealtime();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [approvals, setApprovals] = useState<GigApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [routingGig, setRoutingGig] = useState<Gig | null>(null);

  const loadData = async () => {
    try {
      const [gigsRes, approvalsRes] = await Promise.all([
        api.getMyGigs(),
        api.getHostApprovals().catch(() => ({ approvals: [] })),
      ]);
      setGigs(gigsRes.gigs || []);
      setApprovals(approvalsRes.approvals || []);
    } catch (err) {
      console.error('Failed to load host dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lastEvent?.timestamp]);

  // Zero dummy data metrics calculated strictly from real database records
  const totalGigs = gigs.length;
  const activeGigs = gigs.filter((g) => g.status === 'PUBLISHED' || g.status === 'FILLED' || g.status === 'IN_PROGRESS').length;
  const completedGigs = gigs.filter((g) => g.status === 'COMPLETED').length;
  const totalRequiredWorkers = gigs.reduce((acc, g) => acc + (g.requiredWorkers || 0), 0);
  const totalConfirmedWorkers = gigs.reduce((acc, g) => acc + (g.confirmedWorkers || 0), 0);
  const availableSlots = Math.max(0, totalRequiredWorkers - totalConfirmedWorkers);

  // Escrow calculations from live database records
  const escrowLockedFunds = gigs
    .filter((g) => g.status === 'PUBLISHED' || g.status === 'FILLED' || g.status === 'IN_PROGRESS')
    .reduce((acc, g) => acc + (g.paymentAmount * (g.requiredWorkers || 1)), 0);

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING_APPROVAL');
  const pendingApprovalEscrow = pendingApprovals.reduce(
    (acc, a) => acc + ((a.bookingType === 'REFERRAL_GANG' ? a.consolidatedPayoutAmount : null) ?? a.paymentAmount ?? 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* 1. Admin Command Center Broadcast Sync */}
      <AdminBroadcastBanner targetRole="GIG_HOST" navigate={navigate} />

      {/* 2. High-Priority Interactive Pop-up / Highlight Card on Partner Task Acceptance */}
      <HostTaskAlertCard hostId={user?.id} navigate={navigate} />

      {/* 3. Hero Header Section with Direct Shortcuts */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-400">
            <Building className="w-3.5 h-3.5" />
            Micro-Gig Economy — Host Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome, {user?.fullName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Publish temporary shifts, monitor slot bookings, review on-site check-outs, and release escrow-locked payments securely.
          </p>
        </div>

        {/* Direct Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto relative z-10">
          <button
            type="button"
            onClick={() => navigate('/host/approvals')}
            className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Completion Approvals</span>
            {pendingApprovals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/host/post-gig')}
            className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post New Gig</span>
          </button>
        </div>
      </div>

      {/* 4. Completion Approvals Alert Section (Prominent if pending work) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Shift Completion Approval Required</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-bold text-[11px]">
                    {pendingApprovals.length} Pending
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Workers have checked out on-site and are awaiting your inspection approval to release escrow (₹{pendingApprovalEscrow.toLocaleString()}).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/host/approvals')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer shrink-0"
            >
              <span>Review In Approvals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {pendingApprovals.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate">{item.gigTitle}</span>
                    <span className="font-mono text-emerald-400 font-bold shrink-0">
                      ₹{item.consolidatedPayoutAmount || item.paymentAmount}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Worker: <strong className="text-white">{item.partnerName}</strong>
                    {item.bookingType === 'REFERRAL_GANG' && (
                      <span className="text-indigo-300 ml-1">({item.gangName})</span>
                    )}
                  </div>
                  {item.workNotes && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 italic bg-slate-900 p-2 rounded-lg border border-slate-800">
                      "{item.workNotes}"
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    {item.approvalDeadline
                      ? `Deadline: ${new Date(item.approvalDeadline).toLocaleDateString()}`
                      : 'Standard 24h review'}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/host/approvals')}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Dynamic Escrow Overview & Platform Reserve Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Escrow-Locked Funds
            </span>
            <Lock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
            ₹{escrowLockedFunds.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            100% Pre-funded in Vault Reserve
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Active Gigs
            </span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{activeGigs}</div>
          <div className="text-[11px] text-slate-500">{totalGigs} total published shifts</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Confirmed Workers
            </span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {totalConfirmedWorkers}
          </div>
          <div className="text-[11px] text-slate-500">
            {availableSlots} open position{availableSlots !== 1 ? 's' : ''} left
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Completed Shifts
            </span>
            <CheckCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400">{completedGigs}</div>
          <div className="text-[11px] text-slate-500">Escrow released to workers</div>
        </div>
      </div>

      {/* 6. Active Gig Postings Overview */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              Active Gig Postings & Shift Overview
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time monitoring of applicants, confirmed slots, railway waiting lists, and site attendance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Refresh gigs"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/host/post-gig')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post Another Gig</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse bg-slate-900 rounded-3xl border border-slate-800">
            Querying real-time database records...
          </div>
        ) : gigs.length === 0 ? (
          <EmptyState
            title="No Gigs Published Yet"
            description="Your host dashboard is clean and ready. Post your first flexible shift or FlexiStaff contract with custom durations, pre-funded escrow, and geofenced attendance verification."
            actionText="Post Your First Gig"
            onAction={() => navigate('/host/post-gig')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => {
              const isFilled = (gig.confirmedWorkers || 0) >= gig.requiredWorkers;
              const openSlots = Math.max(0, gig.requiredWorkers - (gig.confirmedWorkers || 0));

              return (
                <div
                  key={gig.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition shadow-lg relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold uppercase truncate">
                        {gig.category === 'Others' ? gig.customCategory : gig.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          gig.status === 'PUBLISHED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : gig.status === 'FILLED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : gig.status === 'IN_PROGRESS'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : gig.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {gig.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white leading-snug">{gig.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {gig.description}
                      </p>
                    </div>

                    {/* Metadata & Slots */}
                    <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Compensation:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          ₹{gig.paymentAmount} ({gig.paymentBasis})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Worker Slots:</span>
                        <span className="font-mono font-bold text-white">
                          <span className={isFilled ? 'text-amber-400' : 'text-emerald-400'}>
                            {gig.confirmedWorkers || 0}
                          </span>{' '}
                          / {gig.requiredWorkers} Confirmed
                        </span>
                      </div>

                      {/* Open slots or waitlist badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Slot Status:</span>
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            isFilled ? 'text-amber-400' : 'text-blue-300'
                          }`}
                        >
                          {isFilled
                            ? 'All Slots Filled (Waitlist Open)'
                            : `${openSlots} Open Slot${openSlots !== 1 ? 's' : ''} Left`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Date & Timing:</span>
                        <span className="text-white font-mono text-[11px]">
                          {gig.workDate} ({gig.shiftStartTime} - {gig.shiftEndTime})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                        <span className="truncate">{gig.workLocation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRoutingGig(gig)}
                      className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition cursor-pointer"
                      title="View Site Location & Directions"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/host/gigs/${gig.id}`)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition text-center cursor-pointer shadow flex items-center justify-center gap-1.5"
                    >
                      <span>Manage Applicants & Slots</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Route Directions Modal */}
      {routingGig && (
        <RouteDirectionsModal
          isOpen={!!routingGig}
          onClose={() => setRoutingGig(null)}
          destination={{
            id: routingGig.id,
            title: routingGig.title,
            fullAddress: routingGig.fullAddress,
            workLocation: routingGig.workLocation,
            lat: routingGig.latitude,
            lng: routingGig.longitude,
            hostName: routingGig.hostName,
            category: routingGig.category,
            paymentAmount: routingGig.paymentAmount,
            paymentBasis: routingGig.paymentBasis,
          }}
        />
      )}
    </div>
  );
};
