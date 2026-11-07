import React, { useState } from 'react';
import {
  Wrench,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  AlertCircle,
  X,
  CreditCard,
  QrCode,
  ArrowRight,
  CheckCircle,
  Compass,
  DollarSign,
  AlertTriangle,
  Timer,
  Navigation,
  Check,
  Building,
  Flag,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { ServiceListing, ServiceBooking } from '../types.ts';
import { InlineAddressPinModal } from './InlineAddressPinModal.tsx';
import { validatePrivacyText } from '../utils/privacyFilter.ts';
import { getCurrentDeviceLocation } from '../utils/geolocation.ts';

interface BookServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceListing;
  onSuccess: (booking: ServiceBooking) => void;
}

export type PricingTier = 'BASE_VISIT' | 'HALF_DAY' | 'FULL_DAY';

export const BookServiceModal: React.FC<BookServiceModalProps> = ({
  isOpen,
  onClose,
  service,
  onSuccess,
}) => {
  const [step, setStep] = useState<'DETAILS' | 'PAYMENT'>('DETAILS');

  // Form Fields
  const [serviceDate, setServiceDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [preferredStartTime, setPreferredStartTime] = useState('09:30 AM');

  // 1. Shift-Based & Base Visit Pricing Structure (3 Options set by Technician)
  const [selectedTier, setSelectedTier] = useState<PricingTier>('BASE_VISIT');

  // Technician's custom rates
  const baseVisitRate = service.price || 200;
  const halfDayRate =
    service.halfDayPrice && service.halfDayPrice > 0
      ? service.halfDayPrice
      : Math.round(baseVisitRate * 3.5);
  const fullDayRate =
    service.fullDayPrice && service.fullDayPrice > 0
      ? service.fullDayPrice
      : Math.round(baseVisitRate * 6.5);

  const getTierMeta = (tier: PricingTier) => {
    switch (tier) {
      case 'HALF_DAY':
        return {
          title: 'Half-Day Shift',
          subLabel: 'Up to 4 Working Hours',
          rate: halfDayRate,
          durationHours: 4,
          shiftType: 'Half-Day Shift',
          description:
            'Dedicated half-day shift defined by technician for comprehensive diagnostics, multi-point repairs, and servicing.',
          badge: '4-Hour Block',
          popular: false,
        };
      case 'FULL_DAY':
        return {
          title: 'Full-Day Shift',
          subLabel: 'Up to 8 Working Hours',
          rate: fullDayRate,
          durationHours: 8,
          shiftType: 'Full-Day Shift',
          description:
            'Complete full-day service coverage defined by technician for extensive home rewiring, whole-house overhaul, or heavy installations.',
          badge: '8-Hour Shift',
          popular: false,
        };
      case 'BASE_VISIT':
      default:
        return {
          title: 'Base Visit / Hourly Rate',
          subLabel: 'Mandatory Minimum Baseline Visit',
          rate: baseVisitRate,
          durationHours: 1,
          shiftType: 'Base Visit',
          description:
            'Mandatory baseline inspection & diagnostic visit charge. Covers arrival, issue diagnosis, and initial baseline repair.',
          badge: 'Baseline Visit',
          popular: true,
        };
    }
  };

  const currentTier = getTierMeta(selectedTier);

  // Address & Clean Map Pinning (No Radar for Seekers)
  const [serviceLocation, setServiceLocation] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(service.latitude || 13.0827);
  const [longitude, setLongitude] = useState<number | undefined>(service.longitude || 80.2707);
  const [customerInstructions, setCustomerInstructions] = useState('');

  // Inline Pin Map Modal State (Clean pin dropper without radar)
  const [showPinModal, setShowPinModal] = useState(false);
  const [isLocatingDevice, setIsLocatingDevice] = useState(false);

  // Payment Rails State
  const [createdBooking, setCreatedBooking] = useState<ServiceBooking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time privacy restriction check to prevent platform bypass
  const privacyCheckLoc = validatePrivacyText(serviceLocation);
  const privacyCheckAddr = validatePrivacyText(serviceAddress);
  const privacyCheckInst = validatePrivacyText(customerInstructions);
  const privacyViolation = privacyCheckLoc.hasViolation
    ? privacyCheckLoc.reason
    : privacyCheckAddr.hasViolation
    ? privacyCheckAddr.reason
    : privacyCheckInst.hasViolation
    ? privacyCheckInst.reason
    : null;

  // Dynamic Escrow Calculations: Standard final service price with internal platform commission
  const baseDepositAmount = currentTier.rate;
  const totalPayableIntoEscrow = baseDepositAmount;

  // Accurate GPS acquisition directly from booking modal
  const handleUseMyGps = async () => {
    setIsLocatingDevice(true);
    setError(null);
    try {
      const loc = await getCurrentDeviceLocation();
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      if (loc.formattedAddress && !serviceAddress) {
        setServiceAddress(loc.formattedAddress);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to read live GPS location.');
    } finally {
      setIsLocatingDevice(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (privacyViolation) {
      setError(`Contact Privacy Restriction: ${privacyViolation}`);
      return;
    }

    if (!serviceDate || !serviceAddress.trim() || !serviceLocation.trim()) {
      setError('Please provide date, landmark/locality, and physical service address.');
      return;
    }

    if (latitude === undefined || longitude === undefined) {
      setError('Please drop an exact pin on the map or use your GPS location.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.bookService(service.id, {
        serviceDate,
        preferredTime: preferredStartTime,
        baseDurationHours: currentTier.durationHours,
        duration: `${currentTier.title} (${currentTier.durationHours} hr${currentTier.durationHours > 1 ? 's' : ''})`,
        shiftType: currentTier.shiftType,
        serviceLocation: serviceLocation.trim(),
        serviceAddress: serviceAddress.trim(),
        latitude,
        longitude,
        customerInstructions: customerInstructions.trim() || undefined,
        // Send chosen rate tier
        selectedTier,
        selectedRate: currentTier.rate,
      });

      setCreatedBooking(res.booking);
      setStep('PAYMENT');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessEscrowPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdBooking) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const ref = paymentMethod === 'UPI' ? upiId.trim() || undefined : undefined;
      const res = await api.payBooking(createdBooking.id, {
        paymentMethod,
        paymentReference: ref,
      });

      onSuccess(res.booking);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden relative my-6 max-h-[94vh] flex flex-col">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Wrench className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-bold uppercase">
                    {service.category === 'Others' ? (service.customCategory || 'Service') : service.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Escrow Protected
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mt-0.5">{service.title}</h3>
                <p className="text-xs text-slate-400">
                  Technician: <strong className="text-slate-200">{service.techPartnerName}</strong> • Base Visit: <strong className="text-emerald-400">₹{baseVisitRate}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 overflow-y-auto">
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {step === 'DETAILS' ? (
              <form onSubmit={handleCreateBooking} className="space-y-6">
                {/* 1. THREE CLEAR SELECTABLE PRICING OPTIONS DETERMINED BY TECH PARTNER */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-white uppercase tracking-wider block">
                        Select Pricing Structure <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Choose from the technician's official pricing tiers for this service:
                      </span>
                    </div>
                    <span className="text-[11px] text-cyan-400 font-mono font-bold">
                      {currentTier.badge}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Option 1: Base Visit / Hourly Rate */}
                    <div
                      onClick={() => setSelectedTier('BASE_VISIT')}
                      className={`p-4 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between ${
                        selectedTier === 'BASE_VISIT'
                          ? 'bg-cyan-500/15 border-cyan-500 text-white ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-950'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                            Tier 1
                          </span>
                          {selectedTier === 'BASE_VISIT' && (
                            <Check className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white">Base Visit / Hourly</h4>
                        <div className="text-xl font-black font-mono text-emerald-400">
                          ₹{baseVisitRate}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          Mandatory minimum baseline inspection & diagnosis visit.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-cyan-400">
                        Initial ~1 hr visit
                      </div>
                    </div>

                    {/* Option 2: Half-Day Shift */}
                    <div
                      onClick={() => setSelectedTier('HALF_DAY')}
                      className={`p-4 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between ${
                        selectedTier === 'HALF_DAY'
                          ? 'bg-cyan-500/15 border-cyan-500 text-white ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-950'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                            Tier 2
                          </span>
                          {selectedTier === 'HALF_DAY' && (
                            <Check className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white">Half-Day Shift</h4>
                        <div className="text-xl font-black font-mono text-emerald-400">
                          ₹{halfDayRate}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          Covers up to 4 consecutive hours on-site work & multi-repairs.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-amber-400">
                        Up to 4 hours shift
                      </div>
                    </div>

                    {/* Option 3: Full-Day Shift */}
                    <div
                      onClick={() => setSelectedTier('FULL_DAY')}
                      className={`p-4 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between ${
                        selectedTier === 'FULL_DAY'
                          ? 'bg-cyan-500/15 border-cyan-500 text-white ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-950'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                            Tier 3
                          </span>
                          {selectedTier === 'FULL_DAY' && (
                            <Check className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white">Full-Day Shift</h4>
                        <div className="text-xl font-black font-mono text-emerald-400">
                          ₹{fullDayRate}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          Comprehensive 8-hour shift for extensive installations or overhauls.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-indigo-400">
                        Up to 8 hours shift
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {currentTier.description} Additional overtime (if logged during on-site check-out) is seamlessly added to the postpaid balance clearance.
                  </p>
                </div>

                {/* Date & Preferred Start Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Service Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Preferred Start Time <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={preferredStartTime}
                      onChange={(e) => setPreferredStartTime(e.target.value)}
                      placeholder="e.g. 09:30 AM or 02:00 PM"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>
                </div>

                {/* 2. ACCURATE MAP PINNING (NO RADAR FOR SEEKERS) */}
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-white uppercase tracking-wider block">
                        Service Property & Pin Location <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Drop an exact pin on your house/building for direct technician GPS navigation:
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleUseMyGps}
                        disabled={isLocatingDevice}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        title="Acquire live device coordinates"
                      >
                        <Navigation className={`w-3.5 h-3.5 text-indigo-400 ${isLocatingDevice ? 'animate-spin' : ''}`} />
                        <span>{isLocatingDevice ? 'Locating...' : 'Use My GPS'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPinModal(true)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        <span>Pin on Map (No Radar)</span>
                      </button>
                    </div>
                  </div>

                  {/* Physical Address Text Box */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-cyan-400" />
                      Physical Property / Flat / Street Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={serviceAddress}
                      onChange={(e) => setServiceAddress(e.target.value)}
                      placeholder="e.g. Flat 4B, Emerald Residency, 12th Cross Street, PIN 600028"
                      className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition ${
                        privacyCheckAddr.hasViolation
                          ? 'border-rose-500 text-rose-200 focus:border-rose-500'
                          : 'border-slate-700 focus:border-cyan-500'
                      }`}
                    />
                    {privacyCheckAddr.hasViolation && (
                      <div className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Contact Info Restricted: {privacyCheckAddr.reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Landmark & Locality Text Box */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-cyan-400" />
                      Landmark & Locality Area <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={serviceLocation}
                      onChange={(e) => setServiceLocation(e.target.value)}
                      placeholder="e.g. Near St. Thomas Church, Opposite Metro Gate 2"
                      className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition ${
                        privacyCheckLoc.hasViolation
                          ? 'border-rose-500 text-rose-200 focus:border-rose-500'
                          : 'border-slate-700 focus:border-cyan-500'
                      }`}
                    />
                    {privacyCheckLoc.hasViolation && (
                      <div className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Contact Info Restricted: {privacyCheckLoc.reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Locked GPS Coordinates Indicator */}
                  {latitude !== undefined && longitude !== undefined && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono text-cyan-400">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>Exact Target Pin Locked:</span>
                        <strong className="text-white">{latitude.toFixed(6)}, {longitude.toFixed(6)}</strong>
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                        50m Geofence Ready
                      </span>
                    </div>
                  )}

                  {/* Optional Work Instructions */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Maintenance Notes & Instructions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={customerInstructions}
                      onChange={(e) => setCustomerInstructions(e.target.value)}
                      placeholder="Describe symptoms, equipment model, or access instructions. (Strictly no contact numbers or email addresses)."
                      className={`w-full bg-slate-950 border rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none transition ${
                        privacyCheckInst.hasViolation
                          ? 'border-rose-500 text-rose-200 focus:border-rose-500'
                          : 'border-slate-700 focus:border-cyan-500'
                      }`}
                    />
                    {privacyCheckInst.hasViolation && (
                      <div className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Contact Info Restricted: {privacyCheckInst.reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Escrow Deposit Summary */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>{currentTier.title} ({currentTier.subLabel})</span>
                    <span className="font-mono text-white font-bold">₹{baseDepositAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Platform Escrow Protection</span>
                    <span className="text-emerald-400 font-medium">Included</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-white font-bold text-sm">
                    <span>Total Service Price (Escrow Deposit)</span>
                    <span className="font-mono text-emerald-400">₹{totalPayableIntoEscrow.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !!privacyViolation}
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/30"
                  >
                    {isSubmitting ? (
                      'Locking Escrow...'
                    ) : (
                      <>
                        <span>Continue to Deposit Escrow</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Payment Rails & Base Escrow Lock */
              <form onSubmit={handleProcessEscrowPayment} className="space-y-5">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Escrow Deposit: {currentTier.title}</span>
                  </div>
                  <p>
                    Your baseline deposit of <strong>₹{totalPayableIntoEscrow.toFixed(2)}</strong> ({currentTier.subLabel}) is securely locked in platform Escrow. Funds are safely held and will only be released after technician on-site check-out and your final completion approval.
                  </p>
                </div>

                {/* Payment Rail Options */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Select Escrow Payment Gateway
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'UPI', label: 'Instant UPI', icon: QrCode },
                      { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
                      { id: 'DEBIT_CARD', label: 'Debit Card', icon: CreditCard },
                      { id: 'NET_BANKING', label: 'Net Banking', icon: DollarSign },
                    ].map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id as any)}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                            paymentMethod === method.id
                              ? 'bg-cyan-500/10 border-cyan-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {paymentMethod === 'UPI' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Enter UPI ID
                    </label>
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@oksbi / yourname@upi"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition"
                    />
                  </div>
                )}

                {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 •••• •••• 8890"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('DETAILS')}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Back to Details
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
                  >
                    {isSubmitting ? (
                      'Securing Escrow...'
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authorize Escrow Lock (₹{totalPayableIntoEscrow.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Clean Pinning Map Modal without Radar */}
      <InlineAddressPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        initialLat={latitude || service.latitude}
        initialLng={longitude || service.longitude}
        initialAddress={serviceAddress}
        initialLandmark={serviceLocation}
        onConfirmLocation={(lat, lng, addr, lmark) => {
          setLatitude(lat);
          setLongitude(lng);
          setServiceAddress(addr);
          if (lmark) setServiceLocation(lmark);
        }}
      />
    </>
  );
};
