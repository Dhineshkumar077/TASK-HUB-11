import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Navigation,
  ShieldCheck,
  User,
  ArrowLeft,
  X,
  Sparkles,
  ArrowRight,
  Sliders,
  Timer,
  Compass,
  AlertTriangle,
  LocateFixed,
  ExternalLink,
  Layers,
  Plus,
  Calculator,
  Check,
  Star,
  Phone,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { ServiceBooking } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';
import { RouteDirectionsModal } from '../../components/RouteDirectionsModal.tsx';
import { SubmitReviewModal } from '../../components/SubmitReviewModal.tsx';
import { getCurrentDeviceLocation } from '../../utils/geolocation.ts';

interface TechBookingsProps {
  navigate: (path: string) => void;
}

// Haversine distance in meters for local geofence checking
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const TechBookings: React.FC<TechBookingsProps> = ({ navigate }) => {
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Active Device GPS Coordinates
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Check-Out Modal State (Extension Choices: Standard, Hourly Overtime, Shift Extension)
  const [checkoutBooking, setCheckoutBooking] = useState<ServiceBooking | null>(null);
  const [checkoutGps, setCheckoutGps] = useState<{ lat: number; lng: number } | null>(null);
  const [loggedHours, setLoggedHours] = useState<number>(4);
  const [workNotes, setWorkNotes] = useState('');
  const [serviceListingData, setServiceListingData] = useState<{ halfDayPrice?: number; fullDayPrice?: number; price?: number } | null>(null);

  // Extension Options:
  // 1. STANDARD: No extra work needed
  // 2. EXTRA_HOURS: Manual extra hours + custom hourly rate typed by technician
  // 3. SHIFT_EXTENSION: Converted to Full-Day (remaining balance calculated from full-day price)
  const [extensionChoice, setExtensionChoice] = useState<'STANDARD' | 'EXTRA_HOURS' | 'SHIFT_EXTENSION'>('STANDARD');
  const [extraHours, setExtraHours] = useState<number>(1);
  const [customHourlyRate, setCustomHourlyRate] = useState<number>(250);
  const [shiftExtensionType, setShiftExtensionType] = useState<'FULL_DAY' | 'SECOND_HALF_DAY'>('FULL_DAY');
  const [fullDayUpgradeAmount, setFullDayUpgradeAmount] = useState<number>(500);

  // GPS Simulation Toggle for testing exact pinned location inside 50m geofence
  const [useSimulatedGps, setUseSimulatedGps] = useState(true);

  // In-app Route Directions Modal State
  const [routingBooking, setRoutingBooking] = useState<ServiceBooking | null>(null);

  // Dynamic Counter-Party Review Modal State
  const [reviewModalBooking, setReviewModalBooking] = useState<ServiceBooking | null>(null);

  const loadBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getMyBookings();
      setBookings(res.bookings || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    acquireCurrentLocation();
  }, []);

  const acquireCurrentLocation = async () => {
    try {
      const loc = await getCurrentDeviceLocation();
      setCurrentGps({ lat: loc.latitude, lng: loc.longitude });
      setGpsError(null);
    } catch {
      setGpsError('Live device location unavailable. You can use the on-site GPS simulator toggle to verify 50m geofence.');
    }
  };

  // Step 2: Strict Geofenced Check-In at Customer Location
  const handleCheckIn = async (booking: ServiceBooking) => {
    setIsProcessing(true);
    setError(null);
    setActionMessage(null);

    // Determine coords: either simulated exact pin (for testing 0m inside geofence) or live device GPS
    const targetLat = booking.latitude || 13.0827;
    const targetLng = booking.longitude || 80.2707;
    const gpsLat = useSimulatedGps ? targetLat : (currentGps?.lat ?? targetLat);
    const gpsLng = useSimulatedGps ? targetLng : (currentGps?.lng ?? targetLng);

    // Check geofence locally (50 meters)
    const distMeters = getDistanceMeters(targetLat, targetLng, gpsLat, gpsLng);
    if (distMeters > 50) {
      setError(`Strict Geofence Violation: You are ${distMeters}m away from the customer's pinned location. Check-in is restricted to within 50 meters. (Toggle 'On-Site GPS Simulation' if testing from remote location).`);
      setIsProcessing(false);
      return;
    }

    try {
      const res = await api.checkInBooking(booking.id, {
        latitude: gpsLat,
        longitude: gpsLng,
      });

      setActionMessage(res.message);
      loadBookings();
    } catch (err: any) {
      setError(err.message || 'Check-in failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Step 3 Check-Out Modal
  const openCheckoutModal = (booking: ServiceBooking) => {
    setCheckoutBooking(booking);
    const targetLat = booking.latitude || 13.0827;
    const targetLng = booking.longitude || 80.2707;
    const gpsLat = useSimulatedGps ? targetLat : (currentGps?.lat ?? targetLat);
    const gpsLng = useSimulatedGps ? targetLng : (currentGps?.lng ?? targetLng);
    setCheckoutGps({ lat: gpsLat, lng: gpsLng });

    // Calculate elapsed time from checkInTime
    const baseHours = booking.baseDurationHours || 4;
    let elapsed = baseHours;
    if (booking.checkInTime) {
      const startMs = new Date(booking.checkInTime).getTime();
      const nowMs = Date.now();
      const diffHours = Math.round(((nowMs - startMs) / (1000 * 3600)) * 10) / 10;
      if (diffHours >= 0.1) {
        elapsed = diffHours;
      }
    }
    setLoggedHours(elapsed);

    // Default custom hourly rate calculation based on booking / listing
    const defaultRate = booking.hourlyRate || Math.max(100, Math.round(booking.servicePrice / baseHours)) || 250;
    setCustomHourlyRate(defaultRate);

    // Full day upgrade calculation: fullDayPrice - halfDayPrice
    const fullPrice = booking.fullDayPrice || Math.round(booking.servicePrice * 1.8);
    const halfPrice = booking.halfDayPrice || booking.servicePrice;
    const defaultUpgrade = fullPrice > halfPrice ? (fullPrice - halfPrice) : Math.round(booking.servicePrice * 0.85);
    setFullDayUpgradeAmount(defaultUpgrade);

    // Initial extension choice setup
    if (elapsed > baseHours + 1.5) {
      setExtensionChoice('SHIFT_EXTENSION');
      setExtraHours(Math.max(1, Math.round((elapsed - baseHours) * 10) / 10));
    } else if (elapsed > baseHours) {
      setExtensionChoice('EXTRA_HOURS');
      setExtraHours(Math.max(1, Math.round((elapsed - baseHours) * 10) / 10));
    } else {
      setExtensionChoice('STANDARD');
      setExtraHours(1);
    }

    setShiftExtensionType('FULL_DAY');
    setWorkNotes('');
    setError(null);

    // Async fetch technician's service listing to retrieve accurate defined pricing
    api.getServiceById(booking.serviceId)
      .then((res) => {
        if (res?.service) {
          setServiceListingData(res.service);
          const fp = res.service.fullDayPrice || fullPrice;
          const hp = res.service.halfDayPrice || halfPrice;
          const upgrade = fp > hp ? (fp - hp) : Math.round(hp * 0.85);
          setFullDayUpgradeAmount(upgrade);
          if (res.service.price) {
            setCustomHourlyRate(booking.hourlyRate || res.service.price || defaultRate);
          }
        }
      })
      .catch(() => {});
  };

  const handleSelectShiftType = (type: 'FULL_DAY' | 'SECOND_HALF_DAY') => {
    setShiftExtensionType(type);
    if (!checkoutBooking) return;
    const halfPrice = serviceListingData?.halfDayPrice || checkoutBooking.halfDayPrice || checkoutBooking.servicePrice;
    const fullPrice = serviceListingData?.fullDayPrice || checkoutBooking.fullDayPrice || Math.round(checkoutBooking.servicePrice * 1.8);
    if (type === 'SECOND_HALF_DAY') {
      setFullDayUpgradeAmount(halfPrice);
    } else {
      setFullDayUpgradeAmount(fullPrice > halfPrice ? (fullPrice - halfPrice) : Math.round(halfPrice * 0.85));
    }
  };

  // Step 3: Check-Out with Extension Options (Standard, Extra Hours, Shift Extension)
  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutBooking) return;
    setIsProcessing(true);
    setError(null);
    setActionMessage(null);

    const targetLat = checkoutBooking.latitude || 13.0827;
    const targetLng = checkoutBooking.longitude || 80.2707;
    const gpsLat = useSimulatedGps ? targetLat : (checkoutGps?.lat ?? currentGps?.lat ?? targetLat);
    const gpsLng = useSimulatedGps ? targetLng : (checkoutGps?.lng ?? currentGps?.lng ?? targetLng);

    // Validate 50-meter operational geofence
    const distMeters = getDistanceMeters(targetLat, targetLng, gpsLat, gpsLng);
    if (distMeters > 50) {
      setError(`Strict Geofence Violation: You are ${distMeters}m away from the customer's pinned location. Check-out is restricted to within 50 meters of the service site.`);
      setIsProcessing(false);
      return;
    }

    try {
      const res = await api.checkOutBooking(checkoutBooking.id, {
        latitude: gpsLat,
        longitude: gpsLng,
        loggedHours,
        extensionChoice,
        extraHours: extensionChoice === 'EXTRA_HOURS' ? extraHours : 0,
        customHourlyRate: extensionChoice === 'EXTRA_HOURS' ? customHourlyRate : undefined,
        shiftExtensionType: extensionChoice === 'SHIFT_EXTENSION' ? shiftExtensionType : undefined,
        fullDayUpgradeAmount: extensionChoice === 'SHIFT_EXTENSION' ? fullDayUpgradeAmount : undefined,
        workNotes,
      });

      setActionMessage(res.message);
      setCheckoutBooking(null);
      loadBookings();
    } catch (err: any) {
      setError(err.message || 'Check-out submission failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/tech/dashboard')}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tech Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Service Booking Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track customer bookings, 50m strict geofenced check-in/out, and duration-based overtime billing.
          </p>
        </div>

        {/* 50m Geofence Mode Toggle */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <LocateFixed className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="text-slate-300 font-bold block">Strict 50m Geofencing</span>
            <span className="text-[11px] text-slate-500">
              {useSimulatedGps ? 'On-Site GPS Simulated (0m Pin Match)' : 'Using Live Device GPS'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setUseSimulatedGps(!useSimulatedGps)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ml-auto ${
              useSimulatedGps
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {useSimulatedGps ? 'On-Site Mode (Active)' : 'Live GPS Mode'}
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
          Loading booking appointments from database...
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No Service Bookings Yet"
          description="When Service Seekers discover your listings and book appointments with verified Escrow payment, your jobs will appear here."
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const targetLat = b.latitude || 13.0827;
            const targetLng = b.longitude || 80.2707;
            const testLat = useSimulatedGps ? targetLat : (currentGps?.lat ?? targetLat);
            const testLng = useSimulatedGps ? targetLng : (currentGps?.lng ?? targetLng);
            const distanceToPin = getDistanceMeters(targetLat, targetLng, testLat, testLng);
            const isWithin50m = distanceToPin <= 50;

            return (
              <div
                key={b.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase font-bold">
                      {b.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        b.customerApproved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : b.status === 'AWAITING_BALANCE_TOPUP'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : b.status === 'CONFIRMED'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : b.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : b.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {b.customerApproved
                        ? 'WORK APPROVED & RELEASED'
                        : b.status === 'AWAITING_BALANCE_TOPUP'
                        ? 'AWAITING POSTPAID BALANCE'
                        : b.status}
                    </span>
                    {b.paymentStatus === 'ESCROW_LOCKED' && !b.customerApproved && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Escrow Locked (₹{b.totalPayableAmount})
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                      <Timer className="w-3 h-3 text-cyan-400" />
                      Base Shift: {b.baseDurationHours || 4} hrs (₹{b.servicePrice})
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white">{b.serviceTitle}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Customer: <strong className="text-white">{b.seekerName}</strong></span>
                      {b.isContactUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[11px] border border-emerald-500/30">
                          📞 {b.seekerMobile} (Direct Unlocked)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px] border border-slate-700">
                          🔒 {b.seekerMobile} (Escrow Protected)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Date: <strong className="text-white font-mono">{b.serviceDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Start Time: <strong className="text-white font-mono">{b.preferredTime}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{b.serviceAddress}</span>
                    </div>

                    {/* Geofence Status Indicator */}
                    <div className="col-span-2 flex items-center gap-2 text-[11px] p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Target Pin: ({targetLat.toFixed(4)}, {targetLng.toFixed(4)})</span>
                      <span className="text-slate-600">•</span>
                      <span className={isWithin50m ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        Distance: {distanceToPin}m ({isWithin50m ? 'Within 50m Geofence' : 'Outside 50m Limit'})
                      </span>
                    </div>

                    {/* Check-In & Check-Out Timestamps */}
                    {b.checkInTime && (
                      <div className="col-span-2 text-xs bg-cyan-950/40 border border-cyan-500/30 p-2.5 rounded-xl text-cyan-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <strong>Check-In (Job Start):</strong> {new Date(b.checkInTime).toLocaleTimeString()} ({b.checkInDistanceMeters ?? 0}m GPS verified)
                        </div>
                        {b.checkOutTime ? (
                          <div>
                            <strong>Check-Out (Job End):</strong> {new Date(b.checkOutTime).toLocaleTimeString()} ({b.loggedDurationHours ?? b.baseDurationHours} hrs logged)
                          </div>
                        ) : (
                          <div className="text-amber-400 font-bold animate-pulse flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5" />
                            <span>Shift In Progress</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Extension / Overtime Logged Display */}
                    {b.isExtended && b.postpaidBalanceAmount ? (
                      <div className="col-span-2 text-xs bg-amber-950/40 border border-amber-500/40 p-3 rounded-2xl text-amber-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-amber-300 flex items-center gap-1.5 font-bold">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            {b.extensionChoice === 'SHIFT_EXTENSION'
                              ? 'Full-Day Shift Extension'
                              : `Hourly Overtime: +${b.extraHoursWorked ?? b.overtimeHours ?? 1} hrs @ ₹${b.customHourlyRate ?? b.hourlyRate ?? 250}/hr`}
                          </strong>
                          <span className="font-mono font-bold text-amber-300">
                            +₹{b.postpaidBalanceAmount} Postpaid Balance
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-200/80">
                          {b.extensionReason || 'Extension requested upon check-out.'}
                        </p>
                        <div className="text-[11px] pt-1 border-t border-amber-500/20 flex items-center justify-between">
                          <span>Seeker Postpaid Clearance Status:</span>
                          <span className={`font-bold ${b.postpaidBalancePaid ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                            {b.postpaidBalancePaid ? 'Cleared & Held in Escrow' : 'Payment Required from Seeker'}
                          </span>
                        </div>
                      </div>
                    ) : b.checkOutTime && !b.isExtended ? (
                      <div className="col-span-2 text-xs bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl text-emerald-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Standard Completion: Finished within base {b.baseDurationHours || 4} hrs. Awaiting Seeker approval to release escrow.</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Action Controls: Strict Geofenced Check-in, Direct Navigation and Check-out */}
                <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 min-w-[220px]">
                  {/* 3. Direct Google Maps Navigation & Routing for Tech Partners */}
                  {(b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS' || b.paymentStatus === 'ESCROW_LOCKED') && (
                    <div className="flex flex-col gap-1.5 w-full">
                      <a
                        href={
                          currentGps
                            ? `https://www.google.com/maps/dir/?api=1&origin=${currentGps.lat},${currentGps.lng}&destination=${targetLat},${targetLng}&travelmode=driving`
                            : `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer text-center"
                      >
                        <Navigation className="w-3.5 h-3.5 fill-current" />
                        <span>Get Directions / Google Maps</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>

                      <button
                        type="button"
                        onClick={() => setRoutingBooking(b)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 hover:text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5 text-indigo-400" />
                        <span>View Route & ETA Preview</span>
                      </button>
                    </div>
                  )}

                  {/* Step 2: Strict Geofenced Check In */}
                  {!b.checkInTime && (b.status === 'CONFIRMED' || b.paymentStatus === 'ESCROW_LOCKED') && (
                    <button
                      onClick={() => handleCheckIn(b)}
                      disabled={isProcessing || !isWithin50m}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow flex items-center justify-center gap-2 cursor-pointer ${
                        isWithin50m
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                      title={isWithin50m ? 'Check in within 50m of location' : `Must be within 50m (currently ${distanceToPin}m)`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Step 2: Check-In on Site</span>
                    </button>
                  )}

                  {/* Step 3: Strict Geofenced Check Out with Duration-Based Billing */}
                  {b.checkInTime && !b.checkOutTime && (
                    <button
                      onClick={() => openCheckoutModal(b)}
                      disabled={isProcessing}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition shadow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Step 3: Check-Out (Work Done)</span>
                    </button>
                  )}

                  {b.checkOutTime && b.status === 'AWAITING_BALANCE_TOPUP' && (
                    <div className="text-center p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                      <div className="font-bold">Awaiting Seeker Top-Up</div>
                      <div className="font-mono text-emerald-400 font-bold">+₹{b.postpaidBalanceAmount}</div>
                      <div className="text-[10px] text-slate-400">Escrow released after clearance</div>
                    </div>
                  )}

                  {b.checkOutTime && !b.customerApproved && b.status !== 'AWAITING_BALANCE_TOPUP' && (
                    <div className="text-center p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300">
                      Awaiting Customer Work Approval
                    </div>
                  )}

                  {b.customerApproved && (
                    <div className="space-y-2">
                      <div className="text-center p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Approved & Escrow Released
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewModalBooking(b)}
                        className="w-full px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-slate-950" />
                        Rate & Review Customer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 3 CHECK-OUT & EXTENSION WORKFLOW MODAL */}
      {checkoutBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 max-w-xl w-full rounded-3xl shadow-2xl overflow-hidden relative my-6">
            <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Timer className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Step 3: Geofenced Check-Out & Settlement</h3>
                  <p className="text-xs text-slate-400">Strict 50m geofence validation and extension choices</p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCheckout} className="p-6 space-y-5">
              {/* Job & Geofence Verification Info */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                    {checkoutBooking.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                    Base Escrow Locked: ₹{checkoutBooking.servicePrice}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{checkoutBooking.serviceTitle}</h4>
                <div className="text-xs text-slate-400">
                  Customer: <strong className="text-slate-200">{checkoutBooking.seekerName}</strong> • Initial Tier: <strong className="text-cyan-300">{checkoutBooking.shiftType || 'Half-Day Shift (4 hrs)'}</strong>
                </div>

                {/* 50m Geofence verification */}
                {(() => {
                  const targetLat = checkoutBooking.latitude || 13.0827;
                  const targetLng = checkoutBooking.longitude || 80.2707;
                  const testLat = useSimulatedGps ? targetLat : (checkoutGps?.lat ?? currentGps?.lat ?? targetLat);
                  const testLng = useSimulatedGps ? targetLng : (checkoutGps?.lng ?? currentGps?.lng ?? targetLng);
                  const dist = getDistanceMeters(targetLat, targetLng, testLat, testLng);
                  const inRange = dist <= 50;

                  return (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Operational Geofence (50m Limit):</span>
                      <span className={`font-mono font-bold ${inRange ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {dist}m away ({inRange ? 'Verified Inside Geofence' : 'Violation: Outside 50m'})
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Check-In & Check-Out Timestamps */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Job Start (Check-In)</span>
                  <span className="text-white font-mono font-bold">
                    {checkoutBooking.checkInTime ? new Date(checkoutBooking.checkInTime).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Job End (Check-Out)</span>
                  <span className="text-white font-mono font-bold">
                    Now ({new Date().toLocaleTimeString()})
                  </span>
                </div>
              </div>

              {/* 1. CHECK-OUT EXTENSION OPTIONS SELECTOR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Check-Out Extension Options <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Initial Booking: <strong className="text-cyan-400">Half-Day (4 hrs)</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: Standard Completion */}
                  <button
                    type="button"
                    onClick={() => setExtensionChoice('STANDARD')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      extensionChoice === 'STANDARD'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/50 shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        extensionChoice === 'STANDARD' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-400'
                      }`}>
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      {extensionChoice === 'STANDARD' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">Standard Completion</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">No extra work needed</div>
                    </div>
                  </button>

                  {/* Option 2: Extra Hours (Hourly Overtime) */}
                  <button
                    type="button"
                    onClick={() => setExtensionChoice('EXTRA_HOURS')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      extensionChoice === 'EXTRA_HOURS'
                        ? 'bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        extensionChoice === 'EXTRA_HOURS' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-400'
                      }`}>
                        <Timer className="w-4 h-4" />
                      </div>
                      {extensionChoice === 'EXTRA_HOURS' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">Extra Hours</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Hourly Overtime</div>
                    </div>
                  </button>

                  {/* Option 3: Shift Extension (Convert to Full-Day) */}
                  <button
                    type="button"
                    onClick={() => setExtensionChoice('SHIFT_EXTENSION')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      extensionChoice === 'SHIFT_EXTENSION'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white ring-1 ring-cyan-500/50 shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        extensionChoice === 'SHIFT_EXTENSION' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-900 text-slate-400'
                      }`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      {extensionChoice === 'SHIFT_EXTENSION' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">Shift Extension</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Convert to Full-Day</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* DYNAMIC DETAILS PANEL BASED ON SELECTED EXTENSION CHOICE */}
              {extensionChoice === 'STANDARD' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Standard Half-Day Completion (No extra work)</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    The job concluded within the scheduled baseline half-day shift (4 hours). No additional overtime or top-up payment is requested from the customer.
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-300">
                    <span>Base Escrow Payout to Release:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">₹{checkoutBooking.servicePrice}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    Submitting will immediately send a completion notification to {checkoutBooking.seekerName} to inspect work and approve releasing escrow funds.
                  </p>
                </div>
              )}

              {extensionChoice === 'EXTRA_HOURS' && (
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <Timer className="w-4 h-4 text-amber-400" />
                      <span>Hourly Overtime Details</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400/80">Input extra hours & hourly rate</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Manual Extra Hours Input */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Extra Hours Worked (Overtime) <span className="text-rose-400">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="12"
                          value={extraHours}
                          onChange={(e) => setExtraHours(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-xs text-slate-400 font-bold shrink-0">hrs</span>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1 pt-1">
                        {[1, 1.5, 2, 3].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setExtraHours(val)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                              extraHours === val
                                ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            +{val}h
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Hourly Extra Charge Rate */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Custom Extra Hourly Rate (₹/hr) <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-mono font-bold">₹</span>
                        <input
                          type="number"
                          step="25"
                          min="50"
                          max="5000"
                          value={customHourlyRate}
                          onChange={(e) => setCustomHourlyRate(Math.max(10, parseFloat(e.target.value) || 0))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                          placeholder="e.g. 250"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Define/type your custom hourly extra charge rate directly.
                      </p>
                    </div>
                  </div>

                  {/* Real-Time Overtime Calculation Breakdown */}
                  {(() => {
                    const otWage = Math.round(extraHours * customHourlyRate * 100) / 100;
                    const fee = Math.round(otWage * 0.08 * 100) / 100;
                    const tax = Math.round(fee * 0.18 * 100) / 100;
                    const topupTotal = Math.round((otWage + fee + tax) * 100) / 100;

                    return (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Overtime Wage ({extraHours} hrs × ₹{customHourlyRate}/hr):</span>
                          <span className="font-mono text-white font-bold">₹{otWage.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>Platform Fee (8%) & GST (18%):</span>
                          <span className="font-mono text-slate-300">₹{(fee + tax).toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex justify-between text-amber-300 font-bold text-sm">
                          <span>Total Postpaid Balance Due from Seeker:</span>
                          <span className="font-mono">₹{topupTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/20 text-[11px] text-amber-200/90 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      A Postpaid Balance payment request will be automatically dispatched to {checkoutBooking.seekerName}. Final escrow payout to your wallet remains locked until the seeker reviews the time logs, approves the overtime, and pays the balance.
                    </span>
                  </div>
                </div>
              )}

              {extensionChoice === 'SHIFT_EXTENSION' && (
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Shift Extension (Convert to Full-Day)</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400/80">Full-Day Pricing Balance</span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Extension Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectShiftType('FULL_DAY')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                          shiftExtensionType === 'FULL_DAY'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Convert to Full-Day (8 hrs)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectShiftType('SECOND_HALF_DAY')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                          shiftExtensionType === 'SECOND_HALF_DAY'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Second Half-Day Shift (+4 hrs)
                      </button>
                    </div>
                  </div>

                  {/* Automatic Price Balance Calculation based on Defined Pricing */}
                  {(() => {
                    const halfPrice = serviceListingData?.halfDayPrice || checkoutBooking.halfDayPrice || checkoutBooking.servicePrice;
                    const fullPrice = serviceListingData?.fullDayPrice || checkoutBooking.fullDayPrice || Math.round(checkoutBooking.servicePrice * 1.8);
                    const isSecondHalf = shiftExtensionType === 'SECOND_HALF_DAY';
                    const remainingDiff = fullDayUpgradeAmount > 0
                      ? fullDayUpgradeAmount
                      : (isSecondHalf ? halfPrice : (fullPrice > halfPrice ? (fullPrice - halfPrice) : Math.round(halfPrice * 0.85)));
                    const fee = Math.round(remainingDiff * 0.08 * 100) / 100;
                    const tax = Math.round(fee * 0.18 * 100) / 100;
                    const topupTotal = Math.round((remainingDiff + fee + tax) * 100) / 100;

                    return (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>{isSecondHalf ? '2nd Half-Day Shift Rate:' : 'Technician Defined Full-Day Rate:'}</span>
                            <span className="font-mono text-white font-bold">₹{isSecondHalf ? halfPrice : fullPrice}</span>
                          </div>
                          {!isSecondHalf && (
                            <div className="flex justify-between text-slate-400">
                              <span>Initial Half-Day Base Paid & Locked:</span>
                              <span className="font-mono text-emerald-400">-₹{halfPrice}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-slate-300 font-semibold pt-1 border-t border-slate-800">
                            <span>{isSecondHalf ? 'Second Shift Addition:' : 'Remaining Full-Day Balance Upgrade:'}</span>
                            <span className="font-mono text-cyan-300 font-bold">₹{remainingDiff}</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>Platform Fee (8%) & GST (18%):</span>
                            <span className="font-mono text-slate-300">₹{(fee + tax).toFixed(2)}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex justify-between text-cyan-300 font-bold text-sm">
                            <span>Total Postpaid Balance Due from Seeker:</span>
                            <span className="font-mono">₹{topupTotal.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Fine-tune Upgrade balance if needed */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-400">
                            Remaining Base Wage Difference (₹):
                          </label>
                          <input
                            type="number"
                            step="50"
                            min="50"
                            value={fullDayUpgradeAmount}
                            onChange={(e) => setFullDayUpgradeAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-[11px] text-cyan-200/90 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      The shift will be upgraded to Full-Day. A Postpaid Balance payment request is sent to {checkoutBooking.seekerName}. Final payout remains locked until the customer pays the balance and approves the work.
                    </span>
                  </div>
                </div>
              )}

              {/* Work completion notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Work Completion Notes & Summary (Optional)
                </label>
                <textarea
                  rows={2}
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  placeholder="e.g. Completed initial maintenance plus 1.5 hrs of additional pipe installation as requested."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutBooking(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`px-6 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition shadow flex items-center gap-2 cursor-pointer ${
                    extensionChoice === 'STANDARD'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : extensionChoice === 'EXTRA_HOURS'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                      : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'
                  }`}
                >
                  {isProcessing ? (
                    'Recording Check-Out...'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {extensionChoice === 'STANDARD'
                          ? 'Submit Standard Check-Out'
                          : extensionChoice === 'EXTRA_HOURS'
                          ? 'Submit Check-Out & Request Overtime Top-Up'
                          : 'Submit Check-Out & Request Full-Day Upgrade'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Interactive Route Directions Modal */}
      {routingBooking && (
        <RouteDirectionsModal
          isOpen={!!routingBooking}
          onClose={() => setRoutingBooking(null)}
          destination={{
            id: routingBooking.id,
            title: routingBooking.serviceTitle,
            fullAddress: routingBooking.serviceAddress,
            workLocation: routingBooking.serviceLocation,
            lat: routingBooking.latitude || 13.0827,
            lng: routingBooking.longitude || 80.2707,
            hostName: routingBooking.seekerName,
            category: routingBooking.category,
            paymentAmount: routingBooking.totalPayableAmount,
            paymentBasis: routingBooking.shiftType,
          }}
          initialOriginLat={currentGps?.lat}
          initialOriginLng={currentGps?.lng}
        />
      )}

      {/* Dynamic Counter-Party Review Modal */}
      {reviewModalBooking && (
        <SubmitReviewModal
          isOpen={!!reviewModalBooking}
          onClose={() => setReviewModalBooking(null)}
          revieweeId={reviewModalBooking.seekerId}
          revieweeName={reviewModalBooking.seekerName}
          revieweeRole="SERVICE_SEEKER"
          division="LOCAL_SERVICE"
          bookingId={reviewModalBooking.id}
          jobTitle={reviewModalBooking.serviceTitle}
          onReviewSubmitted={() => {
            setActionMessage('Your verified review for the customer was submitted and aggregated!');
            loadBookings();
          }}
        />
      )}
    </div>
  );
};
