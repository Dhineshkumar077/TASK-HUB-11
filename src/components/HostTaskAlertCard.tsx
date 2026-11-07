import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  ArrowRight,
  X,
  Sparkles,
  Briefcase,
  Clock,
  MapPin,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext.tsx';

interface HostTaskAlertCardProps {
  navigate: (path: string) => void;
  hostId?: string;
}

interface AlertEventData {
  gigId: string;
  gigTitle: string;
  partnerName: string;
  partnerId?: string;
  slotsCount?: number;
  bookingType?: string;
  paymentAmount?: number;
  workLocation?: string;
  workDate?: string;
  timestamp?: number;
}

export const HostTaskAlertCard: React.FC<HostTaskAlertCardProps> = ({ navigate, hostId }) => {
  const { lastEvent } = useRealtime();
  const [activeAlert, setActiveAlert] = useState<AlertEventData | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Listen to real-time events for GIG_ACCEPTED / SLOT_BOOKED
  useEffect(() => {
    if (!lastEvent) return;

    if (
      (lastEvent.type === 'GIG_ACCEPTED' || lastEvent.type === 'SLOT_BOOKED') &&
      lastEvent.payload
    ) {
      const p = lastEvent.payload;
      // If hostId matches or is broadcasted to the host
      if (!p.hostId || !hostId || p.hostId === hostId) {
        setActiveAlert({
          gigId: p.gigId,
          gigTitle: p.gigTitle || 'Your Micro-Gig Shift',
          partnerName: p.partnerName || 'A Verified Gig Partner',
          partnerId: p.partnerId,
          slotsCount: p.slotsCount || 1,
          bookingType: p.bookingType || 'INDIVIDUAL',
          paymentAmount: p.paymentAmount,
          workLocation: p.workLocation,
          workDate: p.workDate,
          timestamp: Date.now(),
        });
        setIsDismissed(false);
      }
    }
  }, [lastEvent?.timestamp, hostId]);

  if (!activeAlert || isDismissed) return null;

  return (
    <div className="relative animate-fade-in my-2">
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/80 border-2 border-emerald-500/50 shadow-2xl shadow-emerald-950/50 relative overflow-hidden ring-1 ring-emerald-500/30">
        {/* Glow & Backdrop Accents */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          {/* Main Visual & Info */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/20 animate-bounce">
              <Zap className="w-6 h-6 fill-emerald-400 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500 text-slate-950 tracking-wider">
                  New Task Acceptance!
                </span>
                <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Escrow Reserved & Slot Confirmed
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                A Gig Partner has accepted your task!
              </h3>

              <p className="text-xs sm:text-sm text-slate-300">
                <strong className="text-emerald-300">{activeAlert.partnerName}</strong>{' '}
                {activeAlert.bookingType === 'REFERRAL_GANG'
                  ? `reserved ${activeAlert.slotsCount || 1} slots as part of a Referral Gang`
                  : 'reserved a position'}{' '}
                for <span className="text-white font-semibold underline underline-offset-2">"{activeAlert.gigTitle}"</span>.
              </p>

              {(activeAlert.workDate || activeAlert.workLocation) && (
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
                  {activeAlert.workDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Date: {activeAlert.workDate}
                    </span>
                  )}
                  {activeAlert.workLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {activeAlert.workLocation}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interactive CTAs */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Review Later
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDismissed(true);
                navigate(`/host/gigs/${activeAlert.gigId}`);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
            >
              <span>Review Details & Slots</span>
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
