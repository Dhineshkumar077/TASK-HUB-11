import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle,
  Navigation,
  ArrowRight,
  Sparkles,
  BookmarkCheck,
  Compass,
  Layers,
  ShieldCheck,
  RotateCw,
  Wallet,
  Users,
  AlertCircle,
  Calendar,
  ExternalLink,
  Lock,
  Check,
  X,
  Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { api } from '../../services/api.ts';
import { Gig } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';
import { InteractiveMap, MapMarker } from '../../components/InteractiveMap.tsx';
import { BookSlotModal } from '../../components/BookSlotModal.tsx';
import { RouteDirectionsModal } from '../../components/RouteDirectionsModal.tsx';
import { AdminBroadcastBanner } from '../../components/AdminBroadcastBanner.tsx';
import { PartnerNearbyGigAlertModal } from '../../components/PartnerNearbyGigAlertModal.tsx';
import { getCurrentDeviceLocation } from '../../utils/geolocation.ts';

interface PartnerDashboardProps {
  navigate: (path: string) => void;
}

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const { lastEvent } = useRealtime();

  // Nearby gigs within 10 km
  const [nearbyGigs, setNearbyGigs] = useState<Gig[]>([]);
  // Shift schedules / My bookings
  const [myBookings, setMyBookings] = useState<any[]>([]);
  // Wallet earnings
  const [wallet, setWallet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // GPS Coordinates (Default: Chennai baseline 13.0827, 80.2707)
  const [userLat, setUserLat] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('taskhub_live_gps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && !isNaN(parsed.lat)) return parsed.lat;
      }
    } catch {}
    return 13.0827;
  });

  const [userLng, setUserLng] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('taskhub_live_gps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lng && !isNaN(parsed.lng)) return parsed.lng;
      }
    } catch {}
    return 80.2707;
  });

  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState('10 km Radar Synchronized');

  // Interactive Map & Selected Marker
  const [selectedMapGig, setSelectedMapGig] = useState<Gig | null>(null);

  // Modals state
  const [bookingGig, setBookingGig] = useState<Gig | null>(null);
  const [routingGig, setRoutingGig] = useState<Gig | null>(null);

  // Shift Schedules Tab: ALL vs UPCOMING vs COMPLETED
  const [scheduleFilter, setScheduleFilter] = useState<'UPCOMING' | 'WAITLIST' | 'COMPLETED'>('UPCOMING');

  const loadData = async () => {
    try {
      const [gigsRes, walletRes, bookingsRes] = await Promise.all([
        api.getGigs({ userLat, userLng, radiusKm: 10 }),
        api.getMyWallet().catch(() => ({ wallet1Earnings: {} })),
        api.getMyGigBookings().catch(() => ({ bookings: [] })),
      ]);

      setNearbyGigs(gigsRes.gigs || []);
      setWallet(walletRes.wallet1Earnings || {});
      setMyBookings(bookingsRes.bookings || []);
    } catch (err) {
      console.error('Failed to load partner dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userLat, userLng, lastEvent?.timestamp]);

  // Acquire high-accuracy live GPS location
  const handleAcquireLocation = async () => {
    setIsAcquiringGps(true);
    setGpsStatusText('Detecting device location...');
    try {
      const loc = await getCurrentDeviceLocation();
      setUserLat(loc.latitude);
      setUserLng(loc.longitude);
      setGpsStatusText('Live GPS Synchronized (< 10m accuracy)');
      localStorage.setItem('taskhub_live_gps', JSON.stringify({ lat: loc.latitude, lng: loc.longitude }));
    } catch (err: any) {
      console.warn('Geolocation failed or permission denied:', err.message);
      setGpsStatusText('Default radar center active');
    } finally {
      setIsAcquiringGps(false);
    }
  };

  // Convert nearby gigs to MapMarker objects
  const mapMarkers: MapMarker[] = nearbyGigs
    .filter((g) => g.latitude && g.longitude)
    .map((g) => ({
      id: g.id,
      title: g.title,
      lat: g.latitude,
      lng: g.longitude,
      category: g.category === 'Others' ? g.customCategory : g.category,
      price: g.paymentAmount,
      paymentBasis: g.paymentBasis,
      workDate: g.workDate,
      shiftTime: `${g.shiftStartTime} - ${g.shiftEndTime}`,
      workLocation: g.workLocation,
      confirmedWorkers: g.confirmedWorkers,
      requiredWorkers: g.requiredWorkers,
      isFilled: (g.confirmedWorkers || 0) >= g.requiredWorkers,
      distanceKm: g.distanceKm,
      hostName: g.hostName,
    }));

  // Filter schedule items
  const upcomingShifts = myBookings.filter(
    (b) => !b.isWaitlisted && (!b.checkOutTime || b.attendanceStatus !== 'CHECKED_OUT' || !b.hostApproved)
  );
  const waitlistShifts = myBookings.filter((b) => b.isWaitlisted);
  const completedShifts = myBookings.filter(
    (b) => b.hostApproved || (b.checkOutTime && b.attendanceStatus === 'APPROVED')
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* 1. Admin Command Center Broadcast Sync */}
      <AdminBroadcastBanner targetRole="GIG_PARTNER" navigate={navigate} />

      {/* 2. High-Priority Interactive Pop-up / Highlight Card for Nearby Gigs (< 10 km) */}
      <PartnerNearbyGigAlertModal
        navigate={navigate}
        userLat={userLat}
        userLng={userLng}
      />

      {/* 3. Hero Header Section with 10 km Radar & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-400">
            <Briefcase className="w-3.5 h-3.5" />
            Micro-Gig Economy — Partner Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome, {user?.fullName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Discover temporary shifts within your 10 km radius, verify on-site attendance, and receive instant escrow payouts.
          </p>

          {/* GPS Coordinates Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              Radar Center: ({userLat.toFixed(4)}, {userLng.toFixed(4)})
            </span>
            <span className="text-emerald-400 font-semibold">{gpsStatusText}</span>
            <button
              type="button"
              onClick={handleAcquireLocation}
              disabled={isAcquiringGps}
              className="text-blue-400 hover:text-blue-300 underline font-sans font-semibold cursor-pointer ml-1"
            >
              {isAcquiringGps ? 'Acquiring...' : 'Update Device GPS'}
            </button>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto relative z-10">
          <button
            type="button"
            onClick={() => navigate('/partner/browse')}
            className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="w-4 h-4" />
            <span>Browse All Gigs</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/partner/map')}
            className="flex-1 md:flex-none px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-blue-400" />
            <span>Radar Map</span>
          </button>
        </div>
      </div>

      {/* 4. Earnings Tracker Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Available Balance
            </span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            ₹{wallet?.availableWithdrawableBalance ? wallet.availableWithdrawableBalance.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
            <span>Released Escrow</span>
            <button
              type="button"
              onClick={() => navigate('/partner/earnings')}
              className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
            >
              Withdraw →
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Pending in Escrow
            </span>
            <Lock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
            ₹{wallet?.escrowPendingAmount ? wallet.escrowPendingAmount.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">Awaiting host completion review</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              10 km Radius Gigs
            </span>
            <Compass className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{nearbyGigs.length}</div>
          <div className="text-[11px] text-slate-500">Available nearby shifts</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Completed Shifts
            </span>
            <CheckCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400">
            {completedShifts.length}
          </div>
          <div className="text-[11px] text-slate-500">Verified & settled payouts</div>
        </div>
      </div>

      {/* 5. Geospatial Map Widget (10 km Radius) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Geospatial Radar
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Available Shifts Map (10 km Radius)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive Google Maps radar displaying all open micro-gigs within 10 km. Click any marker to view compensation & reserve slots.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAcquireLocation}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              <span>Center on GPS</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/partner/map')}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <span>Full Screen</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="h-[380px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-800 relative">
          <InteractiveMap
            initialLat={userLat}
            initialLng={userLng}
            selectedLat={userLat}
            selectedLng={userLng}
            radiusKm={10}
            showRadarBoundary={true}
            markers={mapMarkers}
            onMarkerClick={(marker) => {
              const matched = nearbyGigs.find((g) => g.id === marker.id);
              if (matched) {
                setSelectedMapGig(matched);
              }
            }}
          />

          {/* Quick Selected Gig Floating Card on Map */}
          {selectedMapGig && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:max-w-md bg-slate-950/95 border-2 border-blue-500/50 backdrop-blur-md rounded-2xl p-4 shadow-2xl z-20 space-y-2 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                    {selectedMapGig.category}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                    {selectedMapGig.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMapGig(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  ₹{selectedMapGig.paymentAmount} ({selectedMapGig.paymentBasis})
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {selectedMapGig.workDate} ({selectedMapGig.shiftStartTime})
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRoutingGig(selectedMapGig)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-400" />
                  <span>Directions</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const gig = selectedMapGig;
                    setSelectedMapGig(null);
                    setBookingGig(gig);
                  }}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <span>Reserve Slot Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Shift Schedules Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Your Shift Schedules & Bookings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Track upcoming shifts, on-site check-in status, and completed work awaiting escrow settlement.
            </p>
          </div>

          {/* Schedule Tab Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setScheduleFilter('UPCOMING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                scheduleFilter === 'UPCOMING'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Upcoming ({upcomingShifts.length})
            </button>

            <button
              type="button"
              onClick={() => setScheduleFilter('WAITLIST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                scheduleFilter === 'WAITLIST'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Waiting List ({waitlistShifts.length})
            </button>

            <button
              type="button"
              onClick={() => setScheduleFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                scheduleFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Completed ({completedShifts.length})
            </button>
          </div>
        </div>

        {/* Schedule List Content */}
        {(() => {
          const list =
            scheduleFilter === 'UPCOMING'
              ? upcomingShifts
              : scheduleFilter === 'WAITLIST'
              ? waitlistShifts
              : completedShifts;

          if (list.length === 0) {
            return (
              <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2">
                <BookmarkCheck className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">
                  {scheduleFilter === 'UPCOMING'
                    ? 'No Upcoming Shifts Scheduled'
                    : scheduleFilter === 'WAITLIST'
                    ? 'No Active Waiting List Positions'
                    : 'No Completed Shifts Logged'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {scheduleFilter === 'UPCOMING'
                    ? 'Check out the nearby shifts list below to reserve flexible positions within 10 km.'
                    : 'Your completed work and verified reviews will show up here.'}
                </p>
                {scheduleFilter === 'UPCOMING' && (
                  <button
                    type="button"
                    onClick={() => navigate('/partner/browse')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow"
                  >
                    Browse Open Shifts
                  </button>
                )}
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((b) => (
                <div
                  key={b.applicationId || b.id}
                  className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4.5 flex flex-col justify-between space-y-3 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold uppercase">
                        {b.category || 'Micro-Gig'}
                      </span>
                      <span
                        className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                          b.isWaitlisted
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : b.hostApproved
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : b.checkOutTime
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                            : b.checkInTime
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {b.isWaitlisted
                          ? `Waitlist #${b.waitlistPosition}`
                          : b.hostApproved
                          ? 'Escrow Released'
                          : b.checkOutTime
                          ? 'Awaiting Inspection'
                          : b.checkInTime
                          ? 'Checked-In'
                          : 'Confirmed'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white leading-snug">{b.gigTitle}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        🏢 Host: <strong className="text-slate-200">{b.hostName}</strong>
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-slate-400 pt-1.5 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span>Net Payout:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          ₹{b.paymentAmount} ({b.paymentBasis})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Shift Timing:</span>
                        <span className="font-mono text-white text-[11px]">
                          {b.workDate} • {b.shiftStartTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{b.workLocation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Action on Home Page */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRoutingGig({
                          id: b.gigId,
                          title: b.gigTitle,
                          fullAddress: b.fullAddress,
                          workLocation: b.workLocation,
                          latitude: b.latitude,
                          longitude: b.longitude,
                          category: b.category,
                          paymentAmount: b.paymentAmount,
                          paymentBasis: b.paymentBasis,
                          hostName: b.hostName,
                        } as any)
                      }
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-blue-300 hover:text-white transition cursor-pointer"
                      title="GPS Route Directions"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/partner/browse?view=bookings')}
                      className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>Manage In Bookings</span>
                      <ArrowRight className="w-3 h-3 text-blue-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* 7. Eligible Gigs within 10 km Radius */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Eligible Micro-Gigs within 10 km Radius
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculated dynamically via Haversine distance from ({userLat.toFixed(4)}, {userLng.toFixed(4)}).
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/partner/browse')}
            className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Explore All Platform Gigs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse bg-slate-900 rounded-3xl border border-slate-800">
            Scanning 10 km radar radius for open shifts...
          </div>
        ) : nearbyGigs.length === 0 ? (
          <EmptyState
            title="No Gigs Currently within 10 km"
            description="There are no active shifts posted within 10 km of your selected coordinates right now. You can adjust your location or check global listings."
            actionText="Browse Global Gigs"
            onAction={() => navigate('/partner/browse')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nearbyGigs.map((gig) => {
              const isFilled = (gig.confirmedWorkers || 0) >= gig.requiredWorkers;
              const openSlots = Math.max(0, gig.requiredWorkers - (gig.confirmedWorkers || 0));

              return (
                <div
                  key={gig.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold uppercase truncate">
                        {gig.category === 'Others' ? gig.customCategory : gig.category}
                      </span>
                      {gig.distanceKm !== undefined && (
                        <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                          {gig.distanceKm < 1
                            ? `${Math.round(gig.distanceKm * 1000)}m away`
                            : `${gig.distanceKm} km away`}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white leading-snug">{gig.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {gig.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Net Payout:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          ₹{gig.paymentAmount} ({gig.paymentBasis})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Date & Timing:</span>
                        <span className="font-mono text-white text-[11px]">
                          {gig.workDate} ({gig.shiftStartTime} - {gig.shiftEndTime})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Slots Status:</span>
                        <span
                          className={`font-mono text-xs font-bold ${
                            isFilled ? 'text-amber-400' : 'text-blue-300'
                          }`}
                        >
                          {isFilled
                            ? 'All Slots Filled (Waitlist)'
                            : `${openSlots} Open Slot${openSlots !== 1 ? 's' : ''} Left`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-0.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{gig.workLocation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRoutingGig(gig)}
                      className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition cursor-pointer"
                      title="Route Directions"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookingGig(gig)}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer"
                    >
                      <span>{isFilled ? 'Join Waiting List' : 'Book Slot Now'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Book Slot Modal */}
      {bookingGig && (
        <BookSlotModal
          isOpen={!!bookingGig}
          onClose={() => setBookingGig(null)}
          gig={bookingGig}
          onSuccess={() => {
            setBookingGig(null);
            loadData();
          }}
        />
      )}

      {/* Route Directions Modal */}
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
          initialOriginLat={userLat}
          initialOriginLng={userLng}
        />
      )}
    </div>
  );
};
