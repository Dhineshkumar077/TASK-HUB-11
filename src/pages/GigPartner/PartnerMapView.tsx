import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Filter,
  DollarSign,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X,
  List,
  Compass,
  Building,
  Shield,
  Layers,
  Globe,
  Radio,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { Gig } from '../../types.ts';
import { InteractiveMap, MapMarker } from '../../components/InteractiveMap.tsx';
import { RouteDirectionsModal } from '../../components/RouteDirectionsModal.tsx';
import { getCurrentDeviceLocation } from '../../utils/geolocation.ts';

interface PartnerMapViewProps {
  navigate: (path: string) => void;
}

export const PartnerMapView: React.FC<PartnerMapViewProps> = ({ navigate }) => {
  // Tabs: 'radius' (10-15km local) vs 'global' (worldwide)
  const [activeTab, setActiveTab] = useState<'radius' | 'global'>('radius');
  const [radiusKm, setRadiusKm] = useState<number>(10);

  // Live GPS tracking states
  const [userLat, setUserLat] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('taskhub_live_gps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && !isNaN(parsed.lat)) return parsed.lat;
      }
    } catch {}
    return 13.0827; // Default baseline
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

  const [gpsAddress, setGpsAddress] = useState<string>('');
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [gpsAccuracyStatus, setGpsAccuracyStatus] = useState<string>('Detecting live coordinates...');

  // Filters & Data
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlyFlexiStaff, setOnlyFlexiStaff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Gig for Details Drawer / Application
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [applyNotes, setApplyNotes] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [routingGig, setRoutingGig] = useState<Gig | null>(null);

  // Check-In modal
  const [checkInGig, setCheckInGig] = useState<Gig | null>(null);
  const [exceptionReason, setExceptionReason] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // 1. Accurate Browser Live GPS Acquisition with Zero Cache Tolerance
  const fetchLiveGPS = useCallback(async (isManual = false) => {
    setIsAcquiringGps(true);
    setGpsAccuracyStatus('Fetching real high-accuracy GPS coordinates...');

    try {
      const loc = await getCurrentDeviceLocation();
      setUserLat(loc.latitude);
      setUserLng(loc.longitude);
      setGpsAccuracyStatus(`Live GPS verified (±${loc.accuracy}m)`);
      if (loc.formattedAddress) {
        setGpsAddress(loc.formattedAddress);
      }
    } catch (err: any) {
      if (isManual) {
        setGpsAccuracyStatus(`GPS error: ${err.message}. Using previous coordinates.`);
      } else {
        setGpsAccuracyStatus('Using saved coordinates anchor.');
      }
    } finally {
      setIsAcquiringGps(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveGPS(false);
  }, [fetchLiveGPS]);

  // 2. Fetch Gigs (Local Radius vs Global)
  const fetchGigs = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        userLat,
        userLng,
        radiusKm: activeTab === 'global' ? 'global' : radiusKm,
      };

      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (search.trim()) params.search = search.trim();
      if (onlyFlexiStaff) params.isFlexiStaff = 'true';

      const res = await api.getGigs(params);
      setGigs(res.gigs || []);
    } catch (err) {
      console.error('Failed to load map gigs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGigs();
  }, [userLat, userLng, activeTab, radiusKm, selectedCategory, onlyFlexiStaff]);

  // 3. Application Handler
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGig) return;
    setIsApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      const res = await api.applyGig(selectedGig.id, applyNotes);
      setApplySuccess(res.message);
      fetchGigs();
    } catch (err: any) {
      setApplyError(err.message || 'Application submission failed.');
    } finally {
      setIsApplying(false);
    }
  };

  // 4. Live GPS Check-In Validation
  const handleCheckIn = async (gig: Gig) => {
    setIsCheckingIn(true);
    setApplyError(null);
    setApplySuccess(null);

    if (!navigator.geolocation) {
      setApplyError('Geolocation is not supported by your browser.');
      setIsCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.checkInGig(gig.id, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            exceptionReason: exceptionReason || undefined,
          });
          setApplySuccess(res.message);
          setCheckInGig(null);
          fetchGigs();
        } catch (err: any) {
          setApplyError(err.message || 'Geofence check-in validation failed.');
        } finally {
          setIsCheckingIn(false);
        }
      },
      (err) => {
        setApplyError(`Live GPS capture failed: ${err.message}. Please enter an exception note if on-site.`);
        setIsCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Convert gigs to interactive map markers
  const markers: MapMarker[] = gigs.map((g) => ({
    id: g.id,
    title: g.title,
    lat: g.latitude,
    lng: g.longitude,
    category: g.category,
    price: g.paymentAmount,
    paymentBasis: g.paymentBasis,
    workDate: g.workDate,
    shiftTime: `${g.shiftStartTime} - ${g.shiftEndTime}`,
    duration: g.customDuration,
    workLocation: g.workLocation,
    confirmedWorkers: g.confirmedWorkers,
    requiredWorkers: g.requiredWorkers,
    isFilled: (g.confirmedWorkers || 0) >= g.requiredWorkers,
    distanceKm: g.distanceKm,
    hostName: g.hostName,
  }));

  // When a map pin or popup button is clicked, select that gig into the detailed panel
  const handleMarkerClick = (marker: MapMarker) => {
    const fullGig = gigs.find((g) => g.id === marker.id);
    if (fullGig) {
      setSelectedGig(fullGig);
      setApplySuccess(null);
      setApplyError(null);
    }
  };

  const categories = [
    'All',
    'Catering',
    'Marriage and Event Staffing',
    'Supermarket',
    'Retail Store',
    'Warehouse',
    'Packing',
    'Loading and Unloading',
    'Food Industry',
    'Delivery Support',
    'Shop Assistance',
    'Promotional Work',
    'Office Assistance',
    'Temporary Contract Work',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-[11px] font-bold text-blue-400">
              <Compass className="w-3.5 h-3.5" />
              Interactive Real-Time Gig Map
            </span>
            <span className="text-xs font-mono text-slate-400">
              {gigs.length} Opportunity{gigs.length !== 1 ? 'ies' : ''} Mapped
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Live Opportunity Radar
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real GPS-anchored interactive Google Maps discovery. Click any map pin for immediate compensation, timing, and booking details.
          </p>
        </div>

        {/* Live GPS & View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchLiveGPS(true)}
            disabled={isAcquiringGps}
            className="px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
            title="Recalculate exact browser geolocation"
          >
            <Navigation className={`w-3.5 h-3.5 ${isAcquiringGps ? 'animate-spin' : ''}`} />
            {isAcquiringGps ? 'Acquiring GPS...' : 'Center My Live GPS'}
          </button>

          <button
            onClick={() => navigate('/partner/browse')}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
          >
            <List className="w-3.5 h-3.5" />
            Switch to List View
          </button>
        </div>
      </div>

      {/* Live GPS Status Indicator Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-300">Live GPS Anchor:</span>
          <span className="font-mono text-blue-400">
            {userLat.toFixed(5)}, {userLng.toFixed(5)}
          </span>
          {gpsAddress && (
            <span className="text-slate-400 hidden sm:inline truncate max-w-md">
              — {gpsAddress}
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          {gpsAccuracyStatus}
        </div>
      </div>

      {/* Split-Up Options: Browse Gigs (20 km Radius) vs Global Gigs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('radius')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'radius'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Browse Gigs (10 - 15 km Radius)
            </button>

            <button
              onClick={() => setActiveTab('global')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'global'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Global Gigs (Worldwide)
            </button>
          </div>

          {/* If Local Radius Tab, show granular radius selection (10km, 12km, 15km) */}
          {activeTab === 'radius' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold mr-1">Radius:</span>
              {[10, 12, 15].map((km) => (
                <button
                  key={km}
                  onClick={() => setRadiusKm(km)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                    radiusKm === km
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Search & Keyword Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="relative sm:col-span-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'global'
                  ? 'Search globally: title, company name, skill, country (e.g. London, Warehouse, Amazon)...'
                  : 'Search local gigs: shop, title, keywords...'
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center justify-between gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyFlexiStaff}
                onChange={(e) => setOnlyFlexiStaff(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
              />
              <span>FlexiStaff Only</span>
            </label>

            <button
              onClick={fetchGigs}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {applySuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{applySuccess}</span>
          </div>
          <button onClick={() => setApplySuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {applyError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{applyError}</span>
          </div>
          <button onClick={() => setApplyError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real Full Google Map View with Click-Through */}
      <div className="relative">
        <InteractiveMap
          selectedLat={userLat}
          selectedLng={userLng}
          onLocationSelect={(lat, lng) => {
            setUserLat(lat);
            setUserLng(lng);
          }}
          radiusKm={activeTab === 'global' ? 'global' : radiusKm}
          markers={markers}
          height="620px"
          onMarkerClick={handleMarkerClick}
          activeMarkerId={selectedGig?.id}
          actionButtonText="View Details & Apply"
        />

        {/* Selected Gig Floating Bottom Card / Detail Drawer */}
        {selectedGig && (
          <div className="mt-4 bg-slate-900 border border-blue-500/40 rounded-3xl p-5 shadow-2xl relative space-y-4 animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold uppercase">
                    {selectedGig.category}
                  </span>
                  {selectedGig.distanceKm !== undefined && (
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      📍 {selectedGig.distanceKm < 1 ? `${Math.round(selectedGig.distanceKm * 1000)}m away` : `${selectedGig.distanceKm} km away`}
                    </span>
                  )}
                  {selectedGig.isFlexiStaff && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">
                      FlexiStaff {selectedGig.flexiStaffDurationMonths}mo
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">{selectedGig.title}</h3>
                {selectedGig.hostName && (
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>Posted by <strong className="text-slate-200">{selectedGig.hostName}</strong></span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedGig(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                title="Close Gig Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              {selectedGig.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Compensation</span>
                <div className="font-mono font-bold text-emerald-400 text-base mt-0.5">
                  ${selectedGig.paymentAmount}
                </div>
                <div className="text-[10px] text-slate-400">{selectedGig.paymentBasis}</div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Shift Timing</span>
                <div className="font-mono text-white text-xs mt-0.5 font-bold truncate">
                  {selectedGig.workDate}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {selectedGig.shiftStartTime} - {selectedGig.shiftEndTime}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Workers Capacity</span>
                <div className="font-mono text-xs mt-0.5 font-bold text-white">
                  {selectedGig.confirmedWorkers || 0} / {selectedGig.requiredWorkers} Confirmed
                </div>
                <div className="text-[10px] text-amber-400">
                  {(selectedGig.confirmedWorkers || 0) >= selectedGig.requiredWorkers ? 'Waiting List Active' : 'Slots Open'}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Location / Address</span>
                <div className="text-white text-xs font-medium truncate mt-0.5">
                  {selectedGig.workLocation}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {selectedGig.fullAddress}
                </div>
              </div>
            </div>

            {/* Quick Actions inside bottom drawer */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <form onSubmit={handleApply} className="flex-1 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={applyNotes}
                  onChange={(e) => setApplyNotes(e.target.value)}
                  placeholder="Optional brief application note or relevant prior experience..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isApplying}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {(selectedGig.confirmedWorkers || 0) >= selectedGig.requiredWorkers ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {isApplying ? 'Joining...' : 'Join Railway Waiting List'}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-3.5 h-3.5" />
                      {isApplying ? 'Submitting...' : 'Apply for Gig Now'}
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setCheckInGig(selectedGig)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                Live Attendance Check-In
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Geofenced Attendance Modal */}
      {checkInGig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                  Location Verified Attendance
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">On-Site Geofenced Check-In</h3>
              </div>
              <button
                onClick={() => setCheckInGig(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              TaskHub strictly checks your real browser GPS coordinates against <strong className="text-white">{checkInGig.title}</strong> within a 200m radius perimeter.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Target Work Location:</div>
              <div className="font-semibold text-white">{checkInGig.workLocation}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                Site GPS: {checkInGig.latitude.toFixed(5)}, {checkInGig.longitude.toFixed(5)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                GPS Exception Note (If device accuracy issues occur indoors)
              </label>
              <input
                type="text"
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="e.g. In basement warehouse with weak GPS signal"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCheckInGig(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCheckingIn}
                onClick={() => handleCheckIn(checkInGig)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Navigation className="w-3.5 h-3.5" />
                {isCheckingIn ? 'Verifying Live GPS...' : 'Verify & Check-In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
