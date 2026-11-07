import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Navigation,
  Sparkles,
  Globe,
  Radio,
  Building,
  Compass,
  X,
  ExternalLink,
  Users,
  User,
  ShieldCheck,
  Lock,
  Unlock,
  FileText,
  BookmarkCheck,
  RotateCw,
  Landmark,
  Check,
  Star,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { Gig } from '../../types.ts';
import { InteractiveMap, MapMarker } from '../../components/InteractiveMap.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { RouteDirectionsModal } from '../../components/RouteDirectionsModal.tsx';
import { BookSlotModal } from '../../components/BookSlotModal.tsx';
import { SubmitReviewModal } from '../../components/SubmitReviewModal.tsx';
import { getCurrentDeviceLocation } from '../../utils/geolocation.ts';

interface BrowseGigsProps {
  navigate: (path: string) => void;
}

export const BrowseGigs: React.FC<BrowseGigsProps> = ({ navigate }) => {
  // Top-level Navigation: Explore Gigs vs. My Active Bookings
  const [mainView, setMainView] = useState<'EXPLORE' | 'MY_BOOKINGS'>('EXPLORE');

  const [gigs, setGigs] = useState<Gig[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'radius' | 'global'>('radius');
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [onlyFlexiStaff, setOnlyFlexiStaff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Live GPS Coordinates
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
  const [gpsStatusText, setGpsStatusText] = useState<string>('Live GPS Synchronized');

  // Modals state
  const [bookingGig, setBookingGig] = useState<Gig | null>(null);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [routingGig, setRoutingGig] = useState<Gig | null>(null);

  // Check-In modal
  const [checkInGig, setCheckInGig] = useState<{ id: string; title: string; workLocation: string; latitude: number; longitude: number } | null>(null);
  const [exceptionReason, setExceptionReason] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Check-Out modal
  const [checkOutBooking, setCheckOutBooking] = useState<any | null>(null);
  const [claimedDuration, setClaimedDuration] = useState('');
  const [workNotes, setWorkNotes] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Alerts
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  // Dynamic Counter-Party Review Modal
  const [reviewingBooking, setReviewingBooking] = useState<any | null>(null);

  // 1. Live GPS Acquisition
  const fetchLiveLocation = useCallback((isManual = false) => {
    if (!navigator.geolocation) {
      setGpsStatusText('Browser geolocation not supported.');
      return;
    }

    setIsAcquiringGps(true);
    setGpsStatusText('Acquiring high-accuracy live GPS...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setUserLat(lat);
        setUserLng(lng);
        setIsAcquiringGps(false);
        setGpsStatusText(`Live GPS verified (±${Math.round(pos.coords.accuracy)}m)`);

        try {
          localStorage.setItem('taskhub_live_gps', JSON.stringify({ lat, lng, timestamp: Date.now() }));
        } catch {}

        try {
          const res = await api.reverseGeocode(lat, lng);
          if (res.formattedAddress) {
            setGpsAddress(res.formattedAddress);
          }
        } catch {
          setGpsAddress(`Coordinates: ${lat}, ${lng}`);
        }
      },
      (err) => {
        setIsAcquiringGps(false);
        if (isManual) {
          setGpsStatusText(`GPS error: ${err.message}. Using active location anchor.`);
        } else {
          setGpsStatusText('Using active coordinates baseline.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    fetchLiveLocation(false);
  }, [fetchLiveLocation]);

  // 2. Fetch Gigs and Partner Bookings
  const loadData = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        userLat,
        userLng,
        radiusKm: activeTab === 'global' ? 'global' : radiusKm,
      };
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (search.trim()) params.search = search.trim();
      if (minPayment) params.minPayment = minPayment;
      if (onlyFlexiStaff) params.isFlexiStaff = 'true';

      const [gigsRes, bookingsRes] = await Promise.all([
        api.getGigs(params),
        api.getMyGigBookings().catch(() => ({ bookings: [] })),
      ]);

      setGigs(gigsRes.gigs || []);
      setMyBookings(bookingsRes.bookings || []);
    } catch (err) {
      console.error('Failed to load gigs/bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userLat, userLng, activeTab, radiusKm, selectedCategory, onlyFlexiStaff]);

  // Set of Gig IDs already booked by this partner
  const bookedGigMap = new Map(myBookings.map((b) => [b.gigId, b]));

  // Check URL query parameters for preselected gig
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedGigId = urlParams.get('gigId');
    if (preselectedGigId && gigs.length > 0) {
      const match = gigs.find((g) => g.id === preselectedGigId);
      if (match) setSelectedGig(match);
    }
  }, [gigs]);

  // 3. Check-In Execution (Live GPS or Simulated On-Site)
  const handleExecuteCheckIn = async (simulateOnSite = false) => {
    if (!checkInGig) return;
    setIsCheckingIn(true);
    setAlertError(null);
    setAlertSuccess(null);

    if (simulateOnSite) {
      try {
        const res = await api.checkInGig(checkInGig.id, {
          simulateOnSite: true,
          exceptionReason: exceptionReason.trim() || undefined,
        });
        setAlertSuccess(res.message);
        setCheckInGig(null);
        setExceptionReason('');
        loadData();
      } catch (err: any) {
        setAlertError(err.message || 'Check-in failed.');
      } finally {
        setIsCheckingIn(false);
      }
      return;
    }

    if (!navigator.geolocation) {
      setAlertError('Geolocation is not supported by your browser. Use "Simulate On-Site GPS".');
      setIsCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.checkInGig(checkInGig.id, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            exceptionReason: exceptionReason.trim() || undefined,
          });
          setAlertSuccess(res.message);
          setCheckInGig(null);
          setExceptionReason('');
          loadData();
        } catch (err: any) {
          setAlertError(err.message || 'Geofence check-in failed.');
        } finally {
          setIsCheckingIn(false);
        }
      },
      (err) => {
        setAlertError(`GPS error: ${err.message}. Try "Simulate On-Site GPS" for testing.`);
        setIsCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 4. Check-Out Execution (Work Done → Awaiting Host Inspection Approval)
  const handleExecuteCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkOutBooking) return;
    setIsCheckingOut(true);
    setAlertError(null);
    setAlertSuccess(null);

    try {
      const res = await api.checkOutGig(checkOutBooking.gigId, {
        claimedDuration: claimedDuration.trim() || undefined,
        workNotes: workNotes.trim() || undefined,
      });
      setAlertSuccess(res.message);
      setCheckOutBooking(null);
      setClaimedDuration('');
      setWorkNotes('');
      loadData();
    } catch (err: any) {
      setAlertError(err.message || 'Check-out failed.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Map Markers
  const mapMarkers: MapMarker[] = gigs.map((g) => ({
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

  const handleMarkerClick = (marker: MapMarker) => {
    const full = gigs.find((g) => g.id === marker.id);
    if (full) {
      setSelectedGig(full);
      setAlertSuccess(null);
      setAlertError(null);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner with Main View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-400 mb-2">
            <Radio className="w-3.5 h-3.5" />
            <span>TaskHub Micro-Gig Economy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Browse Gigs & Book Slots
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Book individual or referral gang slots with pre-funded escrow protection and physical GPS verification.
          </p>
        </div>

        {/* View Mode Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setMainView('EXPLORE')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              mainView === 'EXPLORE'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Browse Opportunities</span>
          </button>

          <button
            onClick={() => setMainView('MY_BOOKINGS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              mainView === 'MY_BOOKINGS'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>My Active Bookings ({myBookings.length})</span>
          </button>

          <button
            onClick={() => fetchLiveLocation(true)}
            disabled={isAcquiringGps}
            className="px-3.5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Update Live GPS"
          >
            <Navigation className={`w-3.5 h-3.5 ${isAcquiringGps ? 'animate-spin' : ''}`} />
            <span>{isAcquiringGps ? 'GPS...' : 'Update GPS'}</span>
          </button>
        </div>
      </div>

      {/* Live GPS Anchor Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-300">Live GPS Location:</span>
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
          {gpsStatusText}
        </div>
      </div>

      {/* Alerts */}
      {alertSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{alertSuccess}</span>
          </div>
          <button onClick={() => setAlertSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {alertError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{alertError}</span>
          </div>
          <button onClick={() => setAlertError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2 & 3 VIEW: MY ACTIVE BOOKINGS TAB                               */}
      {/* ========================================================================= */}
      {mainView === 'MY_BOOKINGS' ? (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-emerald-400" />
                <span>My Active Bookings & Execution Logs</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Track slot reservations, physical on-site check-in logs, and escrow payouts.
              </p>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {myBookings.length === 0 ? (
            <EmptyState
              title="No Active Bookings Yet"
              description="You have not reserved any gig slots yet. Browse available shifts within 10 to 15 km or global opportunities and click 'Book Slot Now'."
              actionText="Browse Available Gigs"
              onAction={() => setMainView('EXPLORE')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myBookings.map((b) => {
                const isGang = b.bookingType === 'REFERRAL_GANG';
                const workerCount = b.gangCount || 1;
                const status = b.attendanceStatus || 'NOT_STARTED';

                const isCheckedIn = status === 'CHECKED_IN';
                const isCheckedOut = status === 'CHECKED_OUT';
                const isApproved = status === 'APPROVED';

                return (
                  <div
                    key={b.applicationId}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-xl hover:border-slate-700 transition"
                  >
                    <div className="space-y-4">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold uppercase">
                              {b.category}
                            </span>
                            {isGang ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1">
                                <Users className="w-3 h-3" /> Gang: {b.gangName} ({workerCount} Slots)
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                Individual Worker
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-white line-clamp-1">{b.gigTitle}</h3>
                          <div className="text-xs text-slate-400">
                            🏢 Posted by <strong className="text-slate-200">{b.hostName}</strong>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {status === 'NOT_STARTED' && (
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                              Slot Reserved
                            </span>
                          )}
                          {isCheckedIn && (
                            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                              Checked-In (On-Site)
                            </span>
                          )}
                          {isCheckedOut && (
                            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              Awaiting Inspection
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              Escrow Released
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details Box */}
                      <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Date & Shift:</span>
                          <span className="text-white font-mono font-semibold">
                            {b.workDate} ({b.shiftStartTime} - {b.shiftEndTime})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Compensation:</span>
                          <span className="text-emerald-400 font-mono font-black text-sm">
                            ₹{b.consolidatedPayoutAmount?.toLocaleString() || (b.paymentAmount * workerCount).toLocaleString()}
                            <span className="text-[11px] text-slate-500 font-normal ml-1">
                              ({workerCount > 1 ? `₹${b.paymentAmount} × ${workerCount}` : b.paymentBasis})
                            </span>
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{b.fullAddress || b.workLocation}</span>
                        </div>
                      </div>

                      {/* Unified Gang Log Box */}
                      {isGang && (
                        <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-xs space-y-1">
                          <div className="font-bold text-indigo-300 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> Unified Gang Check-In / Payout Log
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Consolidated payout sent to: <strong className="text-slate-200">{b.designatedPayoutAccount?.upiId ? `UPI: ${b.designatedPayoutAccount.upiId}` : b.designatedPayoutAccount?.bankAccount ? `A/C: ${b.designatedPayoutAccount.bankAccount}` : 'Wallet'}</strong>
                          </div>
                        </div>
                      )}

                      {/* Execution Timestamps if active */}
                      {(b.checkInTime || b.checkOutTime) && (
                        <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
                          <div>
                            <span className="text-slate-500 block">Arrival Check-In:</span>
                            <span className="text-white font-mono">
                              {b.checkInTime ? new Date(b.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Departure Check-Out:</span>
                            <span className="text-white font-mono">
                              {b.checkOutTime ? new Date(b.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Execution Buttons */}
                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
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
                        className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold transition cursor-pointer"
                        title="View Route Directions"
                      >
                        <Navigation className="w-4 h-4" />
                      </button>

                      {status === 'NOT_STARTED' && (
                        <button
                          type="button"
                          onClick={() =>
                            setCheckInGig({
                              id: b.gigId,
                              title: b.gigTitle,
                              workLocation: b.workLocation,
                              latitude: b.latitude,
                              longitude: b.longitude,
                            })
                          }
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Simulate Arrived & Check-In</span>
                        </button>
                      )}

                      {isCheckedIn && (
                        <button
                          type="button"
                          onClick={() => setCheckOutBooking(b)}
                          className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/20 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Work Done → Check-Out</span>
                        </button>
                      )}

                      {isCheckedOut && (
                        <div className="flex-1 py-2 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 text-[11px] font-semibold text-center">
                          Awaiting Host Inspection Approval
                        </div>
                      )}

                      {isApproved && (
                        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
                          <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold text-center flex items-center justify-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Escrow Released
                          </div>
                          <button
                            type="button"
                            onClick={() => setReviewingBooking(b)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-amber-500/20"
                          >
                            <Star className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Rate & Review Gig Host</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* EXPLORE GIGS TAB (20 KM RADIUS & GLOBAL)                                   */
        /* ========================================================================= */
        <div className="space-y-8 animate-fade-in">
          {/* Split-Up Switcher & Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            {/* Split-Up Option Tabs */}
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

              {/* Granular radius selector for local radius tab */}
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

            {/* Search Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="relative sm:col-span-5">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    activeTab === 'global'
                      ? 'Search globally: title, company name, skill, region...'
                      : 'Search by role, shop, location keywords...'
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
                  onClick={loadData}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow cursor-pointer"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Map Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-blue-400" />
                <span>Radar Map Display</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  ({gigs.length} active gig pin{gigs.length !== 1 ? 's' : ''})
                </span>
              </h2>
            </div>

            <InteractiveMap
              markers={mapMarkers}
              selectedLat={userLat}
              selectedLng={userLng}
              radiusKm={activeTab === 'radius' ? radiusKm : undefined}
              onMarkerClick={handleMarkerClick}
              height="380px"
            />
          </div>

          {/* Gigs Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <span>Available Opportunities</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {gigs.length} {gigs.length === 1 ? 'gig' : 'gigs'} posted by verified hosts
              </span>
            </div>

            {isLoading ? (
              <div className="p-16 text-center text-slate-400 text-sm animate-pulse">
                Fetching latest jobs from real host database...
              </div>
            ) : gigs.length === 0 ? (
              <EmptyState
                title="Zero Gigs Found"
                description={
                  activeTab === 'global'
                    ? 'No global gigs match your search keyword. All listings are dynamically published by registered hosts.'
                    : `No active gigs match your parameters within ${radiusKm} km. Try switching to Global Gigs tab or widening the radius.`
                }
                actionText={activeTab === 'radius' ? 'Switch to Global Gigs' : undefined}
                onAction={activeTab === 'radius' ? () => setActiveTab('global') : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gigs.map((gig) => {
                  const isFilled = (gig.confirmedWorkers || 0) >= gig.requiredWorkers;
                  const isUserBooked = bookedGigMap.has(gig.id);
                  const openSlots = Math.max(0, gig.requiredWorkers - (gig.confirmedWorkers || 0));

                  return (
                    <div
                      key={gig.id}
                      className={`bg-slate-900 border rounded-3xl p-5 flex flex-col justify-between space-y-4 transition shadow-lg ${
                        isUserBooked
                          ? 'border-emerald-500/50 bg-gradient-to-b from-slate-900 to-emerald-950/10 ring-1 ring-emerald-500/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold uppercase truncate">
                            {gig.category === 'Others' ? gig.customCategory : gig.category}
                          </span>
                          {gig.distanceKm !== undefined && (
                            <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                              {gig.distanceKm < 1 ? `${Math.round(gig.distanceKm * 1000)}m away` : `${gig.distanceKm} km away`}
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white leading-snug">{gig.title}</h3>
                          {gig.hostName && (
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                              🏢 {gig.hostName}
                            </div>
                          )}
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{gig.description}</p>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Net Payout:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              ₹{gig.paymentAmount} ({gig.paymentBasis})
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Date & Shift:</span>
                            <span className="font-mono text-white text-[11px]">
                              {gig.workDate} ({gig.shiftStartTime} - {gig.shiftEndTime})
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Duration:</span>
                            <span className="text-slate-300">{gig.customDuration}</span>
                          </div>

                          {/* Dynamic Slot Status */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Slots Status:</span>
                            <span
                              className={`font-mono font-bold text-xs ${
                                isUserBooked
                                  ? 'text-emerald-400'
                                  : isFilled
                                  ? 'text-amber-400'
                                  : 'text-blue-300'
                              }`}
                            >
                              {isUserBooked
                                ? '✓ Reserved for You'
                                : isFilled
                                ? 'All Slots Filled'
                                : `${openSlots} Open Slot${openSlots !== 1 ? 's' : ''} Left`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-1 truncate">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                            <span className="truncate">{gig.workLocation}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Action Buttons */}
                      <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRoutingGig(gig)}
                          className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition cursor-pointer"
                          title="View Location & GPS Directions"
                        >
                          <Navigation className="w-4 h-4" />
                        </button>

                        {isUserBooked ? (
                          <button
                            type="button"
                            onClick={() => setMainView('MY_BOOKINGS')}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Slot Reserved ✓</span>
                          </button>
                        ) : isFilled ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGig(gig);
                              setAlertSuccess(null);
                              setAlertError(null);
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Slots Full (Waitlist)</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setBookingGig(gig);
                              setAlertSuccess(null);
                              setAlertError(null);
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Book Slot Now</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 1. Book Slot Modal (Individual vs Referral Gang) */}
      {bookingGig && (
        <BookSlotModal
          isOpen={!!bookingGig}
          onClose={() => setBookingGig(null)}
          gig={bookingGig}
          onSuccess={() => {
            setAlertSuccess(`Slot reserved successfully for "${bookingGig.title}"!`);
            loadData();
          }}
        />
      )}

      {/* 2. Geofenced On-Site Check-In Modal (Live GPS & Simulate On-Site) */}
      {checkInGig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                  On-Site GPS Validation
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Physical Geofenced Check-In</h3>
              </div>
              <button onClick={() => setCheckInGig(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To check in for <strong className="text-white">{checkInGig.title}</strong>, your device must be within the geofenced site boundary (200m).
            </p>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Target Venue:</div>
              <div className="font-semibold text-white">{checkInGig.workLocation}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                Coordinates: {checkInGig.latitude.toFixed(5)}, {checkInGig.longitude.toFixed(5)}
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
                placeholder="e.g. Inside event hall with weak GPS signal"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isCheckingIn}
                onClick={() => handleExecuteCheckIn(false)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{isCheckingIn ? 'Verifying GPS...' : 'Verify Real Live GPS Location'}</span>
              </button>

              <button
                type="button"
                disabled={isCheckingIn}
                onClick={() => handleExecuteCheckIn(true)}
                className="w-full py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulate Arrived & Check-In (Testing GPS)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Check-Out Modal (Work Done → Awaiting Host Inspection Approval) */}
      {checkOutBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                  Shift Completion
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Work Done → Submit Check-Out</h3>
              </div>
              <button onClick={() => setCheckOutBooking(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Submitting check-out will lock your departure timestamp and move the shift status to{' '}
              <strong className="text-amber-300">"Awaiting Host Inspection Approval"</strong>.
            </p>

            <form onSubmit={handleExecuteCheckOut} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Actual Shift Duration
                </label>
                <input
                  type="text"
                  value={claimedDuration}
                  onChange={(e) => setClaimedDuration(e.target.value)}
                  placeholder="e.g. 4 Hours (Full Shift Completed)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Work Notes / Tasks Executed
                </label>
                <textarea
                  rows={3}
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  placeholder="e.g. Finished loading cartons into aisle 4, handed over inventory sheet to manager."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckOutBooking(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCheckingOut}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                >
                  {isCheckingOut ? 'Recording...' : 'Submit Check-Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Interactive Route Directions Modal */}
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

      {/* Dynamic Counter-Party Review Modal */}
      {reviewingBooking && (
        <SubmitReviewModal
          isOpen={!!reviewingBooking}
          onClose={() => setReviewingBooking(null)}
          revieweeId={reviewingBooking.hostId}
          revieweeName={reviewingBooking.hostName || 'Gig Host'}
          revieweeRole="GIG_HOST"
          division="MICRO_GIG"
          gigId={reviewingBooking.gigId}
          jobTitle={reviewingBooking.gigTitle}
          onReviewSubmitted={() => {
            setAlertSuccess('Your verified review for the Gig Host was submitted and aggregated!');
            loadData();
          }}
        />
      )}
    </div>
  );
};
