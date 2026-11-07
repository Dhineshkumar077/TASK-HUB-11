import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  X,
  Tag,
  Radio,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { Announcement } from '../types.ts';

interface AdminBroadcastBannerProps {
  targetRole: 'GIG_HOST' | 'GIG_PARTNER' | 'ALL';
  navigate: (path: string) => void;
  className?: string;
}

export const AdminBroadcastBanner: React.FC<AdminBroadcastBannerProps> = ({
  targetRole,
  navigate,
  className = '',
}) => {
  const { lastEvent } = useRealtime();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(`dismissed_announcements_${targetRole}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.getAnnouncements(targetRole);
      const active = (res.announcements || []).filter(
        (a: Announcement) => a.isActive && !dismissedIds.has(a.id)
      );
      setAnnouncements(active);
    } catch (err) {
      console.error('Failed to load admin announcements:', err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [targetRole]);

  // Real-time listener: instantly reflect announcements broadcast from Master Admin Panel
  useEffect(() => {
    if (
      lastEvent?.type === 'ANNOUNCEMENT_POSTED' ||
      lastEvent?.type === 'ANNOUNCEMENT_UPDATED'
    ) {
      fetchAnnouncements();
    }
  }, [lastEvent?.timestamp]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = new Set(dismissedIds);
    updated.add(id);
    setDismissedIds(updated);
    try {
      sessionStorage.setItem(
        `dismissed_announcements_${targetRole}`,
        JSON.stringify(Array.from(updated))
      );
    } catch {}
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  if (announcements.length === 0) return null;

  const current = announcements[currentIndex % announcements.length];

  const isUrgent = current.priority === 'URGENT';
  const isPoster = current.bannerType === 'PROMOTIONAL_POSTER' && (current.posterUrl || current.imageUrl);

  const getPriorityStyle = () => {
    if (isUrgent) {
      return {
        bg: 'from-rose-950/80 via-slate-900 to-rose-950/40 border-rose-500/40 text-rose-200',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />,
        glow: 'shadow-rose-950/40',
      };
    }
    if (current.priority === 'HIGH') {
      return {
        bg: 'from-amber-950/80 via-slate-900 to-amber-950/40 border-amber-500/40 text-amber-200',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
        glow: 'shadow-amber-950/40',
      };
    }
    return {
      bg: 'from-indigo-950/80 via-slate-900 to-blue-950/40 border-indigo-500/40 text-indigo-200',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      icon: <Megaphone className="w-4 h-4 text-indigo-400 shrink-0" />,
      glow: 'shadow-indigo-950/40',
    };
  };

  const style = getPriorityStyle();

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r shadow-xl transition-all duration-300 ${style.bg} ${style.glow} ${className}`}
    >
      {/* Visual Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

      {/* Poster Style or Sleek Broadcast Banner */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Content */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 shrink-0 mt-0.5">
            {style.icon}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}
              >
                {current.badgeText || (isUrgent ? 'URGENT NOTICE' : 'ADMIN BROADCAST')}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Live Command Center Sync
              </span>
              {announcements.length > 1 && (
                <span className="text-[10px] text-slate-500 font-mono ml-auto mr-2">
                  {((currentIndex % announcements.length) + 1)} of {announcements.length}
                </span>
              )}
            </div>

            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
              {current.title}
            </h4>

            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {current.body}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          {announcements.length > 1 && (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
              title="Next update"
            >
              Next
            </button>
          )}

          {current.actionUrl && (
            <button
              type="button"
              onClick={() => {
                if (current.actionUrl?.startsWith('http')) {
                  window.open(current.actionUrl, '_blank');
                } else {
                  navigate(current.actionUrl || '/');
                }
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <span>{current.actionLabel || 'View Notice'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => handleDismiss(current.id, e)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
            title="Dismiss announcement"
            aria-label="Dismiss announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
