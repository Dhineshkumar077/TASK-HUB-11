import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Calendar,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Bell,
  Star,
  Navigation,
  Compass,
  DollarSign,
  Layers,
  X,
  ExternalLink,
  Flame,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { api } from '../../services/api.ts';
import { ServiceBooking, ServiceListing, Announcement } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';
import { BookServiceModal } from '../../components/BookServiceModal.tsx';
import { getCurrentDeviceLocation } from '../../utils/geolocation.ts';

interface SeekerDashboardProps {
  navigate: (path: string) => void;
}

const VERIFIED_CATEGORIES = [
  'All',
  'Plumber',
  'Electrician',
  'AC Technician',
  'Bike Mechanic',
  'Carpenter',
  'Painter',
  'Appliance Repair',
  'Washing Machine Repair',
  'Refrigerator Repair',
  'Computer and Laptop Repair',
  'Cleaning Services',
  'Home Maintenance',
  'Installation Services',
  'General Technician',
  'Others',
];

export const SeekerDashboard: React.FC<SeekerDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const { lastEvent } = useRealtime();

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [radiusKm, setRadiusKm] = useState<number>(10); // 10 to 15 km
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000);

  // GPS Location
  const [userLat, setUserLat] = useState<number>(13.0827);
  const [userLng, setUserLng] = useState<number>(80.2707);
  const [locationLabel, setLocationLabel] = useState<string>('Live GPS Ready');
  const [isLocating, setIsLocating] = useState(false);

  // Dashboard Data
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  // Booking Modal
  const [selectedBookingService, setSelectedBookingService] = useState<ServiceListing | null>(null);
  const [bookingSuccessAlert, setBookingSuccessAlert] = useState<string | null>(null);

  // High-accuracy live GPS acquisition
  const handleAcquireGps = async () => {
    setIsLocating(true);
    try {
      const loc = await getCurrentDeviceLocation();
      setUserLat(loc.latitude);
      setUserLng(loc.longitude);
      setLocationLabel(loc.formattedAddress || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
    } catch (err: any) {
      console.warn('GPS prompt dismissed or failed:', err.message);
    } finally {
      setIsLocating(false);
    }
  };

  // Fetch technician services matching search and radius
  const fetchFilteredServices = async () => {
    setIsSearching(true);
    try {
      const params: Record<string, any> = {
        userLat,
        userLng,
        radiusKm,
      };
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getServices(params);
      let list = res.services || [];

      // Filter by min rating and max price
      if (minRating > 0) {
        list = list.filter((s: ServiceListing) => (s.techPartnerRating || 0) >= minRating);
      }
      if (maxPrice < 1000) {
        list = list.filter((s: ServiceListing) => (s.price || s.halfDayPrice || 0) <= maxPrice);
      }

      setServices(list);
    } catch (err) {
      console.error('Failed to search services in real-time:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch Dashboard Overview Data
  const loadDashboardData = async () => {
    try {
      const [bookingsRes, announcementsRes] = await Promise.all([
        api.getMyBookings(),
        api.getAnnouncements('SERVICE_SEEKER'),
      ]);
      setBookings(bookingsRes.bookings || []);
      setAnnouncements(announcementsRes.announcements || []);
    } catch (err) {
      console.error('Failed to load seeker dashboard data:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [lastEvent?.timestamp]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFilteredServices();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, radiusKm, minRating, maxPrice, userLat, userLng]);

  // Featured High-Value / Urgent Pro Calculation
  // 1. If seeker has an active booking that needs attention (IN_PROGRESS or AWAITING_BALANCE_TOPUP)
  const urgentActiveBooking = bookings.find(
    (b) => b.status === 'AWAITING_BALANCE_TOPUP' || b.status === 'IN_PROGRESS' || (b.status === 'CONFIRMED' && !b.checkInTime)
  );

  // 2. High-value / Top-rated featured technician within 10-15 km radius
  const featuredTechnician = services.length > 0
    ? [...services].sort((a, b) => {
        // prioritize highest rating and nearest distance
        const scoreA = (a.techPartnerRating || 0) * 10 - (a.distanceKm || 10);
        const scoreB = (b.techPartnerRating || 0) * 10 - (b.distanceKm || 10);
        return scoreB - scoreA;
      })[0]
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400 mb-2">
            <Wrench className="w-3.5 h-3.5" />
            Service Seeker Home • Verified Local Tech Marketplace
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome, {user?.fullName || 'Valued Customer'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Book verified local technicians with flexible Shift & Base Visit pricing. Funds remain protected in Escrow until you approve work completion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleAcquireGps}
            disabled={isLocating}
            className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
            title="Update precise device GPS"
          >
            <Navigation className={`w-3.5 h-3.5 text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="truncate max-w-[140px]">{isLocating ? 'Locating...' : locationLabel}</span>
          </button>

          <button
            onClick={() => navigate('/seeker/map')}
            className="px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-cyan-950/40"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            Radar Map (10-15 km)
          </button>
        </div>
      </div>

      {bookingSuccessAlert && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{bookingSuccessAlert}</span>
          </div>
          <button
            onClick={() => navigate('/seeker/bookings')}
            className="underline font-bold text-emerald-300 hover:text-white"
          >
            View in My Bookings
          </button>
        </div>
      )}

      {/* 2. ADMIN-CONTROLLED BANNERS & PROMOTIONAL POSTERS (COMMAND CENTER SYNC) */}
      {announcements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-indigo-400" />
              Platform Updates & Offers
            </span>
            <span className="text-[10px] font-mono text-slate-500">Live Broadcast from Command Center</span>
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
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-md">
                        {ann.badgeText || 'SPECIAL OFFER'}
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
                      {ann.badgeText || 'NOTICE'}
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
      {(urgentActiveBooking || featuredTechnician) && (
        <div className="relative rounded-3xl p-6 sm:p-7 border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 shadow-2xl overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                Featured / High-Priority Order Alert (10–15 km Radius)
              </div>

              {urgentActiveBooking ? (
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Active Order in Progress: {urgentActiveBooking.serviceTitle}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Technician <strong>{urgentActiveBooking.techPartnerName}</strong> is assigned. Status:{' '}
                    <span className="font-bold text-amber-400 font-mono">{urgentActiveBooking.status}</span>.
                    {urgentActiveBooking.status === 'AWAITING_BALANCE_TOPUP' &&
                      ' Additional shift duration logged. Customer balance top-up required before approval.'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 font-mono">
                    <span>Shift Date: <strong className="text-white">{urgentActiveBooking.serviceDate}</strong></span>
                    <span>Escrow Amount: <strong className="text-emerald-400">₹{urgentActiveBooking.totalPayableAmount}</strong></span>
                  </div>
                </div>
              ) : featuredTechnician ? (
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    ⚡ {featuredTechnician.title}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Verified Master Technician <strong>{featuredTechnician.techPartnerName}</strong> is active and available nearby.
                    Inspection Base Visit: <span className="font-bold text-emerald-400 font-mono">₹{featuredTechnician.price || 200}</span> |
                    Half-Day: <span className="font-bold text-emerald-400 font-mono">₹{featuredTechnician.halfDayPrice || 450}</span>.
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-300 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {featuredTechnician.techPartnerRating && featuredTechnician.techPartnerRating > 0
                        ? `${featuredTechnician.techPartnerRating.toFixed(1)} Rating`
                        : 'New Tech Partner'}
                    </span>
                    {featuredTechnician.distanceKm !== undefined && (
                      <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border border-emerald-500/30">
                        {featuredTechnician.distanceKm} km away from your GPS
                      </span>
                    )}
                    <span className="text-slate-400 text-[11px]">
                      {featuredTechnician.serviceAreaCoverage || 'Coverage within 15 km'}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              {urgentActiveBooking ? (
                <button
                  onClick={() => navigate('/seeker/bookings')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <span>Manage Active Order</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : featuredTechnician ? (
                <button
                  onClick={() => setSelectedBookingService(featuredTechnician)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Book Priority Pro Now</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 4. CLEAN CATEGORY SELECTOR CHIPS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Browse by Trade Category
          </span>
          <span className="text-[11px] text-cyan-400 font-semibold">
            {selectedCategory === 'All' ? 'Showing All Trades' : `Filtered: ${selectedCategory}`}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {VERIFIED_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {cat === 'All' ? 'All Verified Trades' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 5. SEARCH & SUPER-SEARCH FILTERS BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* Prominent Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords (e.g. pipe leakage repair, AC gas charge, switchboard wiring, carpentry)..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-2xl px-5 py-3.5 pl-12 text-sm text-white placeholder-slate-500 focus:outline-none transition font-medium"
          />
          <Search className="w-5 h-5 text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Sliders & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Operational Radius (10 km to 15 km) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Operating Radius</span>
              <span className="font-mono text-cyan-300">{radiusKm} km Strict</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[10, 12, 15].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => setRadiusKm(km)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    radiusKm === km
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>

          {/* Star Ratings Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Minimum Technician Rating
            </label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="0">Any Star Rating</option>
              <option value="4.0">★ 4.0 & above</option>
              <option value="4.5">★ 4.5 & above (Top Rated)</option>
              <option value="4.8">★ 4.8 & above (Elite)</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            {(selectedCategory !== 'All' || searchQuery || minRating > 0 || radiusKm !== 10) && (
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                  setMinRating(0);
                  setRadiusKm(10);
                }}
                className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6. MATCHING LOCAL TECHNICIAN SERVICES (WITH 3-TIER SHIFT PRICING) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Verified Local Service Listings ({services.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly filtered within your {radiusKm} km operational boundary
            </p>
          </div>

          <button
            onClick={() => navigate('/seeker/map')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
          >
            <span>View Radar Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isSearching ? (
          <div className="p-16 text-center text-slate-400 animate-pulse text-sm bg-slate-900/50 border border-slate-800 rounded-3xl">
            Scanning {radiusKm} km radius for certified tech partners...
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            title={`No Technicians Found within ${radiusKm} km`}
            description="No active technician listings match your current search terms in this radius. Expand the radius to 15 km or explore other trade categories."
            actionText="Expand to 15 km"
            onAction={() => setRadiusKm(15)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 transition shadow-xl group"
              >
                <div className="space-y-3">
                  {/* Category & Distance Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold uppercase tracking-wider">
                      {svc.category === 'Others' ? (svc.customCategory || 'Others') : svc.category}
                    </span>
                    {svc.distanceKm !== undefined && (
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {svc.distanceKm} km away
                      </span>
                    )}
                  </div>

                  {/* Title & Technician Profile */}
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-200 transition">
                      {svc.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                      <strong className="text-white">{svc.techPartnerName}</strong>
                      <span className="text-amber-400 flex items-center gap-0.5 text-[11px] font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {svc.techPartnerRating && svc.techPartnerRating > 0
                          ? svc.techPartnerRating.toFixed(1)
                          : 'New'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {svc.description}
                    </p>
                  </div>

                  {/* 3 Selectable Shift Pricing Options configured by technician */}
                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">1. Base Visit / Inspection:</span>
                      <span className="font-mono font-bold text-cyan-400">
                        ₹{svc.price || 200}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">2. Half-Day Shift (4 hrs):</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{svc.halfDayPrice || (svc.price ? svc.price * 2 : 450)}
                      </span>
                    </div>
                    {svc.fullDayPrice && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">3. Full-Day Shift (8 hrs):</span>
                        <span className="font-mono font-bold text-indigo-400">
                          ₹{svc.fullDayPrice}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate pt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                      <span className="truncate">{svc.serviceAreaCoverage || svc.serviceArea || 'Verified Coverage'}</span>
                    </div>
                  </div>
                </div>

                {/* Booking Action */}
                <div className="pt-2">
                  <button
                    onClick={() => setSelectedBookingService(svc)}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 cursor-pointer"
                  >
                    <span>Book Shift Appointment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. MY ACTIVE APPOINTMENTS PREVIEW */}
      {bookings.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              My Service Bookings & Escrow Status ({bookings.length})
            </h2>
            <button
              onClick={() => navigate('/seeker/bookings')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              View All Orders
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.slice(0, 2).map((b) => (
              <div
                key={b.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 uppercase font-bold">
                    {b.category}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      b.customerApproved
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : b.status === 'AWAITING_BALANCE_TOPUP'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                    }`}
                  >
                    {b.customerApproved ? 'WORK APPROVED' : b.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{b.serviceTitle}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Technician: <strong className="text-white">{b.techPartnerName}</strong> ({b.techPartnerMobile})
                  </p>
                </div>

                <div className="text-xs text-slate-300 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span>Shift: <strong className="text-white font-mono">{b.serviceDate} • {b.preferredTime}</strong></span>
                  <span className="font-mono font-bold text-emerald-400">₹{b.totalPayableAmount}</span>
                </div>

                <button
                  onClick={() => navigate('/seeker/bookings')}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
                >
                  View Details & Escrow Controls
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Book Service Modal with Flexible Pricing, Precise Map Pinning, and Anti-Bypass Filter */}
      {selectedBookingService && (
        <BookServiceModal
          isOpen={!!selectedBookingService}
          onClose={() => setSelectedBookingService(null)}
          service={selectedBookingService}
          onSuccess={(b) => {
            setBookingSuccessAlert(
              `Shift appointment booked! ₹${b.totalPayableAmount} securely deposited into Escrow.`
            );
            setSelectedBookingService(null);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
};
