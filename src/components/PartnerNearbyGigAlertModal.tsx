import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  DollarSign,
  ArrowRight,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { Gig } from '../types.ts';
import { calculateDistanceKm } from '../utils/geolocation.ts';

interface PartnerNearbyGigAlertModalProps {
  navigate: (path: string) => void;
  userLat?: number;
  userLng?: number;
}

export const PartnerNearbyGigAlertModal: React.FC<PartnerNearbyGigAlertModalProps> = ({
  navigate,
  userLat = 13.0827,
  userLng = 80.2707,
}) => {
  const { lastEvent } = useRealtime();
  const [nearbyAlertGig, setNearbyAlertGig] = useState<Gig | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!lastEvent) return;

    if (
      (lastEvent.type === 'GIG_CREATED' || lastEvent.type === 'GIG_PUBLISHED_ESCROW_FUNDED') &&
      lastEvent.payload
    ) {
      const gig = lastEvent.payload;
      // Calculate distance if coordinates exist
      let dist: number | null = null;
      if (gig.latitude && gig.longitude) {
        dist = calculateDistanceKm(userLat, userLng, gig.latitude, gig.longitude);
      }

      // Check if within 10 km or marked high-priority
      if (dist === null || dist <= 10 || gig.paymentAmount >= 500) {
        setNearbyAlertGig(gig);
        setDistanceKm(dist ? Math.round(dist * 10) / 10 : null);
        setIsDismissed(false);
      }
    }
  }, [lastEvent?.timestamp, userLat, userLng]);

  if (!nearbyAlertGig || isDismissed) return null;

  return (
    <div className="relative animate-fade-in my-2">
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 border-2 border-blue-500/50 shadow-2xl shadow-blue-950/60 relative overflow-hidden ring-1 ring-blue-500/30">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          {/* Visual & Job details */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-lg shadow-blue-500/20 animate-pulse">
              <Compass className="w-6 h-6 text-blue-400" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500 text-white tracking-wider">
                  Nearby Shift Alert (Within 10 km)
                </span>
                {distanceKm !== null && (
                  <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m away` : `${distanceKm} km away`}
                  </span>
                )}
                <span className="text-xs text-blue-300 font-mono font-bold">
                  ₹{nearbyAlertGig.paymentAmount} ({nearbyAlertGig.paymentBasis})
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                New Micro-Gig Available Nearby! Tap to view & accept
              </h3>

              <p className="text-xs sm:text-sm text-slate-300">
                <strong className="text-white font-semibold">"{nearbyAlertGig.title}"</strong>{' '}
                posted by <span className="text-indigo-300">{nearbyAlertGig.hostName || 'Verified Host'}</span> at{' '}
                <span className="text-slate-200">{nearbyAlertGig.workLocation}</span>.
              </p>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
                {nearbyAlertGig.workDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Date: {nearbyAlertGig.workDate} ({nearbyAlertGig.shiftStartTime} - {nearbyAlertGig.shiftEndTime})
                  </span>
                )}
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Escrow Pre-Funded
                </span>
              </div>
            </div>
          </div>

          {/* Interactive CTAs */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Dismiss
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDismissed(true);
                navigate(`/partner/browse?gigId=${nearbyAlertGig.id}`);
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
            >
              <span>View & Accept Gig</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition"
              aria-label="Close alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
