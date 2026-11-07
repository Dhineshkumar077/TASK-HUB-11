import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  AlertTriangle,
  CheckCircle,
  Shield,
  Layers,
  ArrowLeft,
  DollarSign,
  Gavel,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Tag,
  Radio,
  Clock,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { Dispute, Announcement } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';

interface CommandCenterProps {
  navigate: (path: string) => void;
}

const PRESET_POSTERS = [
  {
    label: 'Home Care Discount',
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    title: 'Flat 20% Off Weekend Home Care',
    badge: 'SPECIAL PROMO',
    audience: 'SERVICE_SEEKER',
    cta: 'Book Verified Pro',
    link: '/seeker/search',
  },
  {
    label: 'Tech Partner Demand Surge',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    title: 'High Demand Surge: Earn 1.5x Base Visit Today',
    badge: 'SURGE INCENTIVE',
    audience: 'TECH_PARTNER',
    cta: 'View Open Orders',
    link: '/tech/bookings',
  },
  {
    label: 'Express Electrical & AC Repair',
    url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    title: 'Monsoon Quick Fix: Verified Technicians On-Site within 60 Mins',
    badge: 'RAPID DISPATCH',
    audience: 'SERVICE_SEEKER',
    cta: 'Find Local Techs',
    link: '/seeker/search',
  },
];

export const CommandCenter: React.FC<CommandCenterProps> = ({ navigate }) => {
  const { lastEvent } = useRealtime();

  // Broadcast announcement form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'SERVICE_SEEKER' | 'TECH_PARTNER' | 'GIG_PARTNER' | 'GIG_HOST'>('ALL');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [bannerType, setBannerType] = useState<'PROMOTIONAL_POSTER' | 'ANNOUNCEMENT' | 'SYSTEM_UPDATE'>('PROMOTIONAL_POSTER');
  const [badgeText, setBadgeText] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);

  // Live broadcasts list from DB
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);

  // Disputes arbitration
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [arbitrationDecision, setArbitrationDecision] = useState<'REFUND_SEEKER' | 'RELEASE_TO_PARTNER'>('REFUND_SEEKER');
  const [arbitrationNotes, setArbitrationNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState<string | null>(null);

  const loadAnnouncements = async () => {
    try {
      const res = await api.getAdminAnnouncements();
      setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  const loadDisputes = async () => {
    try {
      const res = await api.getAdminDisputes();
      setDisputes(res.disputes || []);
    } catch (err) {
      console.error('Failed to load disputes:', err);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    loadDisputes();
  }, [lastEvent?.timestamp]);

  const handleApplyPreset = (preset: typeof PRESET_POSTERS[0]) => {
    setPosterUrl(preset.url);
    setTitle(preset.title);
    setBadgeText(preset.badge);
    setTargetAudience(preset.audience as any);
    setActionLabel(preset.cta);
    setActionUrl(preset.link);
    setBannerType('PROMOTIONAL_POSTER');
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setIsBroadcasting(true);
    setBroadcastMessage(null);

    try {
      const res = await api.broadcastAnnouncement({
        title: title.trim(),
        body: body.trim(),
        targetAudience,
        priority,
        bannerType,
        badgeText: badgeText.trim() || undefined,
        posterUrl: bannerType === 'PROMOTIONAL_POSTER' ? posterUrl.trim() : undefined,
        imageUrl: bannerType === 'PROMOTIONAL_POSTER' ? posterUrl.trim() : undefined,
        actionUrl: actionUrl.trim() || undefined,
        actionLabel: actionLabel.trim() || undefined,
      });

      setBroadcastMessage(res.message);
      setTitle('');
      setBody('');
      loadAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Broadcast failed.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;
    try {
      await api.deleteAdminAnnouncement(id);
      loadAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to remove announcement.');
    }
  };

  const handleToggleAnnouncement = async (id: string) => {
    try {
      await api.toggleAdminAnnouncement(id);
      loadAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;
    setIsResolving(true);
    setDisputeSuccess(null);

    try {
      const res = await api.resolveAdminDispute(selectedDispute.id, {
        decision: arbitrationDecision,
        adminNotes: arbitrationNotes,
      });

      setDisputeSuccess(res.message);
      setSelectedDispute(null);
      setArbitrationNotes('');
      loadDisputes();
    } catch (err: any) {
      alert(err.message || 'Dispute resolution failed.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Master Admin Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Bell className="w-7 h-7 text-indigo-400" />
              Admin Command Center & Global Broadcast Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Broadcast live promotional posters, urgent updates, and banners directly to Service Seeker and Tech Partner home pages in real-time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Real-Time Sync Active
            </span>
          </div>
        </div>
      </div>

      {broadcastMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{broadcastMessage}</span>
        </div>
      )}

      {disputeSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{disputeSuccess}</span>
        </div>
      )}

      {/* Main Broadcast Creator & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Broadcast Form (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-400 mb-2">
              <Send className="w-3.5 h-3.5" />
              Portal Broadcast Publisher
            </div>
            <h2 className="text-xl font-bold text-white">Create Announcement or Promotional Poster</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Publish rich banners or posters that render instantly on the targeted portal home pages.
            </p>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quick Preset Templates
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_POSTERS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-2.5 rounded-xl border border-slate-800 hover:border-indigo-500/50 bg-slate-950/60 hover:bg-slate-800/50 text-left transition flex flex-col justify-between"
                >
                  <span className="text-[11px] font-bold text-white truncate">{preset.label}</span>
                  <span className="text-[10px] text-indigo-400 font-mono mt-1">{preset.audience.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Target Portal <span className="text-rose-400">*</span>
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="ALL">All Portals (Global)</option>
                  <option value="SERVICE_SEEKER">Service Seeker Portal</option>
                  <option value="TECH_PARTNER">Tech Partner Portal</option>
                  <option value="GIG_PARTNER">Gig Partner Portal</option>
                  <option value="GIG_HOST">Gig Host Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Banner Style
                </label>
                <select
                  value={bannerType}
                  onChange={(e) => setBannerType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="PROMOTIONAL_POSTER">Promotional Poster (with Image)</option>
                  <option value="ANNOUNCEMENT">Standard Announcement Banner</option>
                  <option value="SYSTEM_UPDATE">System Alert / Policy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Alert</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Badge Tag
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. SPECIAL OFFER or URGENT"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Headline Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Festive Maintenance Discount"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {bannerType === 'PROMOTIONAL_POSTER' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Poster Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono"
                  />
                  {posterUrl && (
                    <img
                      src={posterUrl}
                      alt="Thumbnail"
                      className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Announcement Body Message <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the detailed broadcast message that will appear on user home pages..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Button Action Label
                </label>
                <input
                  type="text"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  placeholder="e.g. Book Technician Now"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Action Route Link
                </label>
                <input
                  type="text"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="e.g. /seeker/search or /tech/bookings"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isBroadcasting}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isBroadcasting ? 'Broadcasting to Database...' : 'Broadcast Live to Portal Home Pages'}
            </button>
          </form>
        </div>

        {/* Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Live User Home Page Preview
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {targetAudience}
              </span>
            </div>

            {/* Poster Preview Card */}
            {bannerType === 'PROMOTIONAL_POSTER' ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl">
                <div className="h-44 w-full relative">
                  <img
                    src={posterUrl || PRESET_POSTERS[0].url}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-md">
                      {badgeText || 'PROMOTION'}
                    </span>
                  </div>
                  {priority === 'URGENT' && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white uppercase">
                        URGENT
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h4 className="text-base font-extrabold text-white leading-tight">
                    {title || 'Headline Title Preview'}
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-3">
                    {body || 'This is how your broadcast announcement will be displayed to users.'}
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">Live Admin Broadcast</span>
                    <button
                      type="button"
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition flex items-center gap-1.5"
                    >
                      {actionLabel || 'Learn More'}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-indigo-500/40 bg-indigo-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                    {badgeText || 'NOTICE'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Target: {targetAudience}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{title || 'Headline Title Preview'}</h4>
                <p className="text-xs text-slate-300">{body || 'Body text preview...'}</p>
                {actionLabel && (
                  <div className="pt-2">
                    <span className="text-xs text-indigo-400 font-semibold underline flex items-center gap-1">
                      {actionLabel} <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Broadcasts Feed & Dispute Tribunal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Broadcasts Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400 mb-1">
                <Layers className="w-3.5 h-3.5" />
                Live Broadcasts in Cloud Database ({announcements.length})
              </div>
              <h2 className="text-xl font-bold text-white">Active Home Page Banners & Posters</h2>
            </div>
            <button
              onClick={loadAnnouncements}
              className="text-xs text-slate-400 hover:text-white transition underline"
            >
              Refresh
            </button>
          </div>

          {announcements.length === 0 ? (
            <EmptyState
              title="No Broadcasts Active"
              description="Zero active announcements in database. Publish one above to show live on portals."
            />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-4 rounded-2xl border transition ${
                    ann.isActive
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {(ann.posterUrl || ann.imageUrl) && (
                        <img
                          src={ann.posterUrl || ann.imageUrl}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-800"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              ann.priority === 'URGENT'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {ann.badgeText || ann.priority}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {ann.targetAudience}
                          </span>
                          {!ann.isActive && (
                            <span className="text-[10px] font-mono text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
                              Inactive
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white">{ann.title}</h4>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2">{ann.body}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleAnnouncement(ann.id)}
                        title={ann.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-2 rounded-xl border transition ${
                          ann.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {ann.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        title="Delete Broadcast"
                        className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dispute Arbitration Tribunal */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-400 mb-2">
              <Gavel className="w-3.5 h-3.5" />
              Escrow Dispute Arbitration
            </div>
            <h2 className="text-xl font-bold text-white">Open Escrow Disputes ({disputes.length})</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review cases where payment release was halted by customer or partner disagreements.
            </p>
          </div>

          {disputes.length === 0 ? (
            <EmptyState
              title="No Active Disputes"
              description="Zero unresolved complaints. All marketplace transactions are executing normally."
            />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="bg-slate-950 p-4 rounded-2xl border border-rose-500/30 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400 uppercase font-mono text-[10px]">
                      {d.reasonCategory}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {d.resolutionStatus}
                    </span>
                  </div>

                  <div className="text-slate-300">
                    Raised by: <strong className="text-white">{d.raisedByName}</strong> against <strong className="text-white">{d.againstUserName}</strong>
                  </div>

                  <p className="text-slate-400 italic bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    "{d.description}"
                  </p>

                  {d.resolutionStatus === 'OPEN' && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setSelectedDispute(d)}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
                      >
                        Arbitrate Case
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Arbitration Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-lg font-bold text-white">Arbitrate Dispute #{selectedDispute.id.slice(0, 8)}</h3>
            <p className="text-xs text-slate-300">
              Complaint: <em>"{selectedDispute.description}"</em>
            </p>

            <form onSubmit={handleResolveDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Administrative Ruling
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setArbitrationDecision('REFUND_SEEKER')}
                    className={`p-3 rounded-xl border text-xs font-bold transition ${
                      arbitrationDecision === 'REFUND_SEEKER'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Refund Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setArbitrationDecision('RELEASE_TO_PARTNER')}
                    className={`p-3 rounded-xl border text-xs font-bold transition ${
                      arbitrationDecision === 'RELEASE_TO_PARTNER'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Release to Partner
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Arbitration Finding Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={arbitrationNotes}
                  onChange={(e) => setArbitrationNotes(e.target.value)}
                  placeholder="Summarize evidence reviewed and justification for decision..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
                >
                  {isResolving ? 'Executing...' : 'Commit Binding Ruling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
