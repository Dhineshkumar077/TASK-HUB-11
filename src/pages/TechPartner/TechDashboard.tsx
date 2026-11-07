import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Calendar,
  DollarSign,
  PlusCircle,
  Star,
  MapPin,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Bell,
  Navigation,
  Compass,
  Flame,
  Zap,
  ExternalLink,
  Map as MapIcon,
  List,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { api } from '../../services/api.ts';
import { ServiceListing, ServiceBooking, Announcement } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';
import { RouteDirectionsModal } from '../../components/RouteDirectionsModal.tsx';
import { InteractiveMap } from '../../components/InteractiveMap.tsx';
import { getCurrentDeviceLocation, calculateDistanceKm } from '../../utils/geolocation.ts';

interface TechDashboardProps {
  navigate: (path: string) => void;
}

export const TechDashboard: React.FC<TechDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const { lastEvent } = useRealtime();

  const [services, setServices] = useState<ServiceListing[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [walletData, setWalletData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View toggle: 'CARDS' or 'MAP'
  const [viewMode, setViewMode] = useState<'CARDS' | 'MAP'>('CARDS');

  // Directions Modal
  const [directionsBooking, setDirectionsBooking] = useState<ServiceBooking | null>(null);

  // Live GPS tracking
  const [techLat, setTechLat] = useState<number>(13.0827);
  const [techLng, setTechLng] = useState<number>(80.2707);
  const [locationLabel, setLocationLabel] = useState<string>('Live GPS Ready');
  const [isLocating, setIsLocating] = useState(false);

  // High-accuracy live GPS acquisition
  const handleAcquireGps = async () => {
    setIsLocating(true);
    try {
      const loc = await getCurrentDeviceLocation();
      setTechLat(loc.latitude);
      setTechLng(loc.longitude);
      setLocationLabel(loc.formattedAddress || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
    } catch (err: any) {
      console.warn('GPS prompt dismissed or failed:', err.message);
    } finally {
      setIsLocating(false);
    }
  };

  const loadData = async () => {
    try {
      const [servicesRes, bookingsRes, walletRes, announcementsRes] = await Promise.all([
        api.getMyServices(),
        api.getMyBookings(),
        api.getMyWallet(),
        api.getAnnouncements('TECH_PARTNER'),
      ]);
      setServices(servicesRes.services || []);
      setBookings(bookingsRes.bookings || []);
      setWalletData(walletRes);
      setAnnouncements(announcementsRes.announcements || []);
    } catch (err) {
      console.error('Failed to load tech partner dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    handleAcquireGps();
  }, [lastEvent?.timestamp]);

  const activeServices = services.filter((s) => s.isActive).length;
  const activeBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS' || b.status === 'AWAITING_BALANCE_TOPUP'
  );
  const completedJobs = bookings.filter((b) => b.customerApproved).length;
  const wallet1 = walletData?.wallet1Earnings || {};
  const wallet2 = walletData?.wallet2Withdrawals || {};

  // Featured High-Value / High-Priority Order in 10-15 km radius
  // Find booking that is either high-value (totalPayableAmount >= 500 or Full-Day Shift) or active requiring arrival
  const highPriorityOrder = activeBookings.length > 0
    ? [...activeBookings].sort((a, b) => {
        // Prioritize confirmed waiting checkin, then highest payable amount
        const urgencyA = !a.checkInTime ? 1000 : 0;
        const urgencyB = !b.checkInTime ? 1000 : 0;
        return (urgencyB + b.totalPayableAmount) - (urgencyA + a.totalPayableAmount);
      })[0]
    : null;

  // Calculate distance for high priority order
  const highPriorityDistance = highPriorityOrder && highPriorityOrder.latitude && highPriorityOrder.longitude
    ? calculateDistanceKm(techLat, techLng, highPriorityOrder.latitude, highPriorityOrder.longitude)
    : null;

  // Direct external Google Maps navigation launcher
  const handleOpenGoogleMaps = (lat: number, lng: number, address?: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${
      address ? `&destination_place_id=${encodeURIComponent(address)}` : ''
    }`;
    window.location.href = url;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400 mb-2">
            <Wrench className="w-3.5 h-3.5" />
            Tech Partner Command Home • Local Service Marketplace
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome, {user?.fullName || 'Technician'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Manage your service appointments, track live Escrow deposits, and execute geofenced GPS check-ins at customer addresses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleAcquireGps}
            disabled={isLocating}
            className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
            title="Update precise technician GPS"
          >
            <Navigation className={`w-3.5 h-3.5 text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="truncate max-w-[140px]">{isLocating ? 'Locating...' : locationLabel}</span>
          </button>

          <button
            onClick={() => navigate('/tech/create-service')}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-600/30 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Create Service
          </button>
        </div>
      </div>

      {/* 2. ADMIN-CONTROLLED BANNERS & PROMOTIONAL POSTERS (COMMAND CENTER SYNC) */}
      {announcements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-indigo-400" />
              Platform Announcements & Tech Partner Broadcasts
            </span>
            <span className="text-[10px] font-mono text-slate-500">Live Command Center Feed</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`rounded-3xl border overflow-hidden transition shadow-xl ${
                  ann.priority === 'URGENT'
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {(ann.posterUrl || ann.imageUrl) ? (
                  <div className="relative h-44 w-full overflow-hidden">
                    <img
                      src={ann.posterUrl || ann.imageUrl}
                      alt={ann.title}
                      className="w-full h-full object-cover transition duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md">
                        {ann.badgeText || 'PARTNER INCENTIVE'}
                      </span>
                    </div>
                    {ann.priority === 'URGENT' && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white uppercase shadow-md">
                          URGENT
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-base font-extrabold text-white leading-tight drop-shadow-md">
                        {ann.title}
                      </h3>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 uppercase">
                      {ann.badgeText || 'TECH UPDATE'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{ann.priority}</span>
                  </div>
                )}

                <div className="p-4 sm:p-5 space-y-3">
                  {!(ann.posterUrl || ann.imageUrl) && (
                    <h3 className="text-base font-bold text-white">{ann.title}</h3>
                  )}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {ann.body}
                  </p>

                  {ann.actionUrl && (
                    <div className="pt-1">
                      <button
                        onClick={() => navigate(ann.actionUrl!)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                      >
                        <span>{ann.actionLabel || 'View Details'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. FEATURED HIGH-VALUE / HIGH-PRIORITY ORDER DISPLAY BOX */}
      {highPriorityOrder && (
        <div className="relative rounded-3xl p-6 sm:p-7 border-2 border-cyan-500/50 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/30 shadow-2xl overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black uppercase tracking-wider">
                <Flame className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                Featured / High-Priority Order Dispatch (10–15 km Radius)
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {highPriorityOrder.serviceTitle} ({highPriorityOrder.shiftType || 'Standard Shift'})
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Customer <strong>{highPriorityOrder.seekerName}</strong> pinned destination:{' '}
                  <span className="text-white font-medium">{highPriorityOrder.serviceAddress || highPriorityOrder.serviceLocation}</span>
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-2 flex-wrap font-mono">
                  <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    Escrow Locked: ₹{highPriorityOrder.totalPayableAmount}
                  </span>
                  {highPriorityDistance !== null && (
                    <span className="bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full font-bold border border-cyan-500/30">
                      📍 {highPriorityDistance} km from your GPS
                    </span>
                  )}
                  <span className="text-amber-400 font-bold">
                    Date: {highPriorityOrder.serviceDate} ({highPriorityOrder.preferredTime})
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-stretch gap-2.5 w-full sm:w-auto">
              {highPriorityOrder.latitude && highPriorityOrder.longitude && (
                <button
                  onClick={() =>
                    handleOpenGoogleMaps(
                      highPriorityOrder.latitude!,
                      highPriorityOrder.longitude!,
                      highPriorityOrder.serviceAddress
                    )
                  }
                  className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open in Google Maps</span>
                </button>
              )}

              <button
                onClick={() => setDirectionsBooking(highPriorityOrder)}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition border border-slate-700 flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>In-App Directions</span>
              </button>

              <button
                onClick={() => navigate('/tech/bookings')}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
              >
                <span>Check-In / Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DUAL WALLET METRICS ROW (ZERO DUMMY DATA) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1 shadow-lg">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Active Catalog
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white">{activeServices}</div>
          <div className="text-[11px] text-slate-500">Out of {services.length} services</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1 shadow-lg">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Escrow-Pending (Wallet 1)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
            ₹{wallet1.escrowPendingAmount ? wallet1.escrowPendingAmount.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">Locked until customer approves completion</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1 shadow-lg">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Withdrawable (Wallet 2)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            ₹{wallet2.availableWithdrawableBalance ? wallet2.availableWithdrawableBalance.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">Available for payout</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-1 shadow-lg">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Active Orders
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            {activeBookings.length}
          </div>
          <div className="text-[11px] text-slate-500">{completedJobs} completed jobs settled</div>
        </div>
      </div>

      {/* 5. VIEW TOGGLE: CARDS vs INTERACTIVE LIVE SERVICE MAP */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              Active Orders & Customer Pins ({activeBookings.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Appointments with Escrow deposits waiting for your arrival, GPS check-in, and completion.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800 self-start">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'CARDS'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Cards View
            </button>
            <button
              onClick={() => setViewMode('MAP')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'MAP'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Interactive Live Map (10-15 km)
            </button>
          </div>
        </div>

        {/* Dynamic Display based on view toggle */}
        {viewMode === 'MAP' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-2">
              <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                <Compass className="w-4 h-4" />
                Live Map showing your position and customer service address pins
              </span>
              <span className="font-mono text-[11px]">Center: {techLat.toFixed(4)}, {techLng.toFixed(4)}</span>
            </div>

            <div className="h-[480px] w-full rounded-2xl overflow-hidden border border-slate-800">
              <InteractiveMap
                initialLat={techLat}
                initialLng={techLng}
                selectedLat={techLat}
                selectedLng={techLng}
                markers={activeBookings
                  .filter((b) => b.latitude && b.longitude)
                  .map((b) => ({
                    id: b.id,
                    title: `${b.seekerName} — ${b.serviceTitle}`,
                    lat: b.latitude!,
                    lng: b.longitude!,
                    category: b.category,
                    price: b.totalPayableAmount,
                    workLocation: b.serviceAddress || b.serviceLocation,
                  }))}
                radiusKm={12}
                showRadarBoundary={false}
                height="480px"
                readOnly
              />
            </div>
          </div>
        ) : (
          <div>
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm animate-pulse">
                Loading your appointments...
              </div>
            ) : activeBookings.length === 0 ? (
              <EmptyState
                title="No Active Orders Pending"
                description="You have no customer bookings currently awaiting execution. New orders booked by Service Seekers will appear here instantly in real-time."
                actionText="View Published Services"
                onAction={() => navigate('/tech/bookings')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeBookings.map((b) => {
                  const dist = b.latitude && b.longitude
                    ? calculateDistanceKm(techLat, techLng, b.latitude, b.longitude)
                    : null;

                  return (
                    <div
                      key={b.id}
                      className="bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 transition shadow-xl"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold uppercase tracking-wider">
                            {b.category}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              b.status === 'IN_PROGRESS'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white">{b.serviceTitle}</h3>
                          <p className="text-xs text-slate-300 mt-1">
                            Customer: <strong className="text-white">{b.seekerName}</strong>
                          </p>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Shift Type:</span>
                            <span className="font-semibold text-white">{b.shiftType || 'Standard'}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Date & Time:</span>
                            <span className="font-mono text-white">{b.serviceDate} • {b.preferredTime}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Escrow Payout:</span>
                            <span className="font-mono font-bold text-emerald-400 text-sm">₹{b.totalPayableAmount}</span>
                          </div>

                          {dist !== null && (
                            <div className="flex items-center justify-between text-slate-400 pt-1">
                              <span>Distance from GPS:</span>
                              <span className="font-mono text-cyan-300 font-bold">{dist} km</span>
                            </div>
                          )}

                          <div className="flex items-start gap-1 text-[11px] text-slate-400 pt-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400 mt-0.5" />
                            <span className="line-clamp-2">{b.serviceAddress || b.serviceLocation}</span>
                          </div>
                        </div>
                      </div>

                      {/* Direct Navigation & Check-in Actions */}
                      <div className="pt-2 space-y-2 border-t border-slate-800">
                        {b.latitude && b.longitude && (
                          <button
                            onClick={() => handleOpenGoogleMaps(b.latitude!, b.longitude!, b.serviceAddress)}
                            className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-cyan-900/30"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Open in Google Maps</span>
                          </button>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setDirectionsBooking(b)}
                            className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                          >
                            <Compass className="w-3 h-3 text-cyan-400" />
                            Directions
                          </button>
                          <button
                            onClick={() => navigate('/tech/bookings')}
                            className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            Check-In
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. QUICK ACTIONS: DUAL WALLET & PUBLISHED SERVICES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Dual-Wallet System & Payout Transfers
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track your Escrow-Pending funds from customer bookings and withdraw settled earnings directly to your bank account or UPI ID.
            </p>
          </div>
          <button
            onClick={() => navigate('/tech/wallet')}
            className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition flex items-center justify-center gap-2"
          >
            Manage Dual Wallet & Withdraw
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Published Services & Shift Pricing ({services.length})
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Define your Base Visit inspection rate, Half-Day Shift, and Full-Day rates across certified trade categories.
            </p>
          </div>
          <button
            onClick={() => navigate('/tech/create-service')}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-2"
          >
            + Create / Edit Service Listings
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-app Route Directions Modal */}
      {directionsBooking && directionsBooking.latitude && directionsBooking.longitude && (
        <RouteDirectionsModal
          isOpen={!!directionsBooking}
          onClose={() => setDirectionsBooking(null)}
          destination={{
            id: directionsBooking.id,
            title: directionsBooking.serviceTitle,
            fullAddress: directionsBooking.serviceAddress || directionsBooking.serviceLocation,
            workLocation: directionsBooking.serviceLocation,
            lat: directionsBooking.latitude,
            lng: directionsBooking.longitude,
            hostName: directionsBooking.seekerName,
            category: directionsBooking.category,
            paymentAmount: directionsBooking.totalPayableAmount,
            paymentBasis: directionsBooking.shiftType,
          }}
          initialOriginLat={techLat}
          initialOriginLng={techLng}
        />
      )}
    </div>
  );
};
