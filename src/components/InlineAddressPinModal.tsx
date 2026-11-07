import React, { useState, useEffect } from 'react';
import {
  MapPin,
  X,
  CheckCircle,
  Navigation,
  Compass,
  AlertCircle,
  ShieldCheck,
  Building,
  Flag,
  AlertTriangle,
} from 'lucide-react';
import { InteractiveMap } from './InteractiveMap.tsx';
import { getCurrentDeviceLocation } from '../utils/geolocation.ts';
import { validatePrivacyText } from '../utils/privacyFilter.ts';

interface InlineAddressPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  initialLandmark?: string;
  onConfirmLocation: (lat: number, lng: number, address: string, landmark?: string) => void;
}

export const InlineAddressPinModal: React.FC<InlineAddressPinModalProps> = ({
  isOpen,
  onClose,
  title = 'Pin Exact Service Location on Map',
  initialLat = 13.0827,
  initialLng = 80.2707,
  initialAddress = '',
  initialLandmark = '',
  onConfirmLocation,
}) => {
  const [pinnedLat, setPinnedLat] = useState<number>(initialLat);
  const [pinnedLng, setPinnedLng] = useState<number>(initialLng);
  const [address, setAddress] = useState<string>(initialAddress);
  const [landmark, setLandmark] = useState<string>(initialLandmark);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialLat && !isNaN(initialLat)) setPinnedLat(initialLat);
      if (initialLng && !isNaN(initialLng)) setPinnedLng(initialLng);
      if (initialAddress) setAddress(initialAddress);
      if (initialLandmark) setLandmark(initialLandmark);
      setError(null);
    }
  }, [isOpen, initialLat, initialLng, initialAddress, initialLandmark]);

  if (!isOpen) return null;

  // Real-time contact info privacy validation
  const privacyCheckAddr = validatePrivacyText(address);
  const privacyCheckLandmark = validatePrivacyText(landmark);
  const hasPrivacyViolation = privacyCheckAddr.hasViolation || privacyCheckLandmark.hasViolation;
  const privacyErrorMsg = privacyCheckAddr.hasViolation
    ? privacyCheckAddr.reason
    : privacyCheckLandmark.reason;

  // High-accuracy live GPS acquisition with zero cache tolerance
  const handleUseGps = async () => {
    setIsLocating(true);
    setError(null);

    try {
      const loc = await getCurrentDeviceLocation();
      setPinnedLat(loc.latitude);
      setPinnedLng(loc.longitude);
      if (loc.formattedAddress) {
        setAddress(loc.formattedAddress);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve live device GPS. Please check browser location permissions.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirm = () => {
    if (hasPrivacyViolation) {
      setError(`Contact Privacy Restriction: ${privacyErrorMsg}`);
      return;
    }

    if (!address.trim()) {
      setError('Please provide or confirm the physical property / street address.');
      return;
    }

    onConfirmLocation(
      pinnedLat,
      pinnedLng,
      address.trim(),
      landmark.trim() || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden relative my-4 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <MapPin className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <p className="text-[11px] text-slate-400">
                Drop an exact pin on your property/address. Direct GPS routing will guide the technician to this spot.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-3">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Exact Coordinates: </span>
              <strong className="text-white">{pinnedLat.toFixed(6)}, {pinnedLng.toFixed(6)}</strong>
            </div>

            <button
              type="button"
              onClick={handleUseGps}
              disabled={isLocating}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-600/30"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Acquiring GPS...' : 'Use My Precise Location'}</span>
            </button>
          </div>

          {/* Interactive Google Map Pin Dropper - Pure Pinning without Radar */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
            <InteractiveMap
              selectedLat={pinnedLat}
              selectedLng={pinnedLng}
              showRadarBoundary={false}
              radiusKm={0}
              height="300px"
              onLocationSelect={(lat, lng, addr) => {
                setPinnedLat(lat);
                setPinnedLng(lng);
                if (addr) setAddress(addr);
              }}
            />
          </div>

          {/* Physical Address & Landmark Inputs with Strict Privacy Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-cyan-400" />
                Physical Property / Street Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Flat 3A, Green Valley Apts, 4th Cross St"
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition ${
                  privacyCheckAddr.hasViolation
                    ? 'border-rose-500 text-rose-200 focus:border-rose-500'
                    : 'border-slate-800 focus:border-cyan-500'
                }`}
              />
              {privacyCheckAddr.hasViolation && (
                <div className="text-[10px] text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Contact info restricted: {privacyCheckAddr.reason}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-cyan-400" />
                Landmark & Locality Area
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => {
                  setLandmark(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Opposite Apollo Pharmacy, Near Metro"
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition ${
                  privacyCheckLandmark.hasViolation
                    ? 'border-rose-500 text-rose-200 focus:border-rose-500'
                    : 'border-slate-800 focus:border-cyan-500'
                }`}
              />
              {privacyCheckLandmark.hasViolation && (
                <div className="text-[10px] text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Contact info restricted: {privacyCheckLandmark.reason}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Direct GPS Lock: The technician will receive direct Google Maps navigation to this exact pin coordinate for on-site check-in within 50m.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={hasPrivacyViolation}
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-600/30 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Confirm & Lock Pin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
