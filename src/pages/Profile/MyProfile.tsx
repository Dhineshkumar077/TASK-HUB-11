import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Briefcase,
  Wrench,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  MapPin,
  Shield,
  ShieldCheck,
  Star,
  Award,
  Edit3,
  Phone,
  Mail,
  ArrowUpRight,
  Sparkles,
  Layers,
  ChevronRight,
  Save,
  X,
  CreditCard,
  FileText,
  Lock,
  Unlock,
  AlertCircle,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { api } from '../../services/api.ts';
import { EmptyState } from '../../components/EmptyState.tsx';
import { RatingStars } from '../../components/RatingStars.tsx';
import { EditGigModal } from '../../components/EditGigModal.tsx';
import { EditServiceModal } from '../../components/EditServiceModal.tsx';
import type { RatingBreakdown, Review, Gig, ServiceListing } from '../../types.ts';

interface MyProfileProps {
  navigate: (path: string) => void;
}

export const MyProfile: React.FC<MyProfileProps> = ({ navigate }) => {
  const { user, login } = useAuth();
  const { lastEvent } = useRealtime();

  const [historyData, setHistoryData] = useState<any>(null);
  const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdown | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab State based on Portal Role
  // Gig Host: 'posted_gigs' | 'overview' | 'reviews'
  // Tech Partner: 'posted_services' | 'overview' | 'reviews'
  // Gig Partner: 'work_history' | 'overview' | 'reviews'
  // Service Seeker: 'booking_history' | 'overview' | 'reviews'
  const getDefaultTab = (role?: string) => {
    switch (role) {
      case 'GIG_HOST':
        return 'posted_gigs';
      case 'TECH_PARTNER':
        return 'posted_services';
      case 'GIG_PARTNER':
        return 'work_history';
      case 'SERVICE_SEEKER':
        return 'booking_history';
      default:
        return 'overview';
    }
  };

  const [activeTab, setActiveTab] = useState<string>(() => getDefaultTab(user?.role));

  // Edit Modals
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState(user?.fullName || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editLocation, setEditLocation] = useState(user?.preferredLocation || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveProfileMsg, setSaveProfileMsg] = useState<string | null>(null);

  // Gig Edit Modal (Gig Host)
  const [selectedGigForEdit, setSelectedGigForEdit] = useState<Gig | null>(null);
  const [isGigEditOpen, setIsGigEditOpen] = useState(false);
  const [gigStatusFilter, setGigStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'FILLED' | 'COMPLETED'>('ALL');

  // Service Edit Modal (Tech Partner)
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState<ServiceListing | null>(null);
  const [isServiceEditOpen, setIsServiceEditOpen] = useState(false);

  // Work History Filter (Gig Partner)
  const [workHistoryFilter, setWorkHistoryFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'WAITLISTED'>('ALL');

  // Booking History Filter (Service Seeker)
  const [bookingHistoryFilter, setBookingHistoryFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED'>('ALL');

  const loadHistory = async () => {
    try {
      const res = await api.getUserHistory();
      setHistoryData(res.history || null);
      if (user?.id) {
        const revRes = await api.getUserReviews(user.id);
        if (revRes) {
          setRatingBreakdown(revRes.breakdown || null);
          setUserReviews(revRes.reviews || []);
        }
      }
    } catch (err) {
      console.error('Failed to load user account history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [lastEvent?.timestamp]);

  useEffect(() => {
    if (user) {
      setEditFullName(user.fullName || '');
      setEditBio(user.bio || '');
      setEditLocation(user.preferredLocation || '');
      setActiveTab((prev) => (prev ? prev : getDefaultTab(user.role)));
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveProfileMsg(null);
    try {
      const res = await api.updateProfile({
        fullName: editFullName.trim(),
        bio: editBio.trim(),
        preferredLocation: editLocation.trim(),
      });
      if (res.user) {
        const token = localStorage.getItem('taskhub_token') || '';
        login(token, res.user);
        setSaveProfileMsg('Profile information updated successfully in database.');
        setTimeout(() => setIsEditingProfile(false), 800);
      }
    } catch (err: any) {
      setSaveProfileMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleGigUpdated = (updatedGig: Gig) => {
    // Immediate optimistic update in local state
    if (historyData?.gigs) {
      setHistoryData({
        ...historyData,
        gigs: historyData.gigs.map((g: Gig) => (g.id === updatedGig.id ? updatedGig : g)),
      });
    }
    loadHistory();
  };

  const handleServiceUpdated = (updatedService: ServiceListing) => {
    // Immediate optimistic update in local state
    if (historyData?.services) {
      setHistoryData({
        ...historyData,
        services: historyData.services.map((s: ServiceListing) =>
          s.id === updatedService.id ? updatedService : s
        ),
      });
    }
    loadHistory();
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <EmptyState
          title="Sign In Required"
          description="Please log into your TaskHub portal account to inspect your profile, listings, and performance records."
          actionText="Go to Login"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  const roleBadge = (role: string) => {
    switch (role) {
      case 'GIG_PARTNER':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'GIG_HOST':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'TECH_PARTNER':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'SERVICE_SEEKER':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  const stats = historyData?.stats || {};

  // Filtered Gigs for Gig Host
  const rawHostGigs: Gig[] = historyData?.gigs || [];
  const filteredHostGigs = rawHostGigs.filter((g) => {
    if (gigStatusFilter === 'ALL') return true;
    return g.status === gigStatusFilter;
  });

  // Filtered Services for Tech Partner
  const techServices: ServiceListing[] = historyData?.services || [];

  // Filtered Work History for Gig Partner
  const rawWorkHistory: any[] = historyData?.workHistory || [];
  const filteredWorkHistory = rawWorkHistory.filter((item) => {
    if (workHistoryFilter === 'ALL') return true;
    if (workHistoryFilter === 'COMPLETED') return item.isCompleted || item.attendance?.hostApproved;
    if (workHistoryFilter === 'IN_PROGRESS') return item.status === 'APPROVED' && !item.isCompleted;
    if (workHistoryFilter === 'WAITLISTED') return item.status === 'WAITLISTED';
    return true;
  });

  // Filtered Booking History for Service Seeker
  const rawSeekerBookings: any[] = historyData?.bookings || [];
  const filteredSeekerBookings = rawSeekerBookings.filter((b) => {
    if (bookingHistoryFilter === 'ALL') return true;
    if (bookingHistoryFilter === 'ACTIVE') return b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS';
    if (bookingHistoryFilter === 'COMPLETED') return b.status === 'COMPLETED';
    if (bookingHistoryFilter === 'DISPUTED') return b.status === 'DISPUTED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Profile Header Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-blue-500 border-2 border-indigo-400/40 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-600/30">
              {user.fullName.charAt(0).toUpperCase()}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${roleBadge(
                    user.role
                  )}`}
                >
                  {user.role.replace('_', ' ')}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Cloud Account
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {user.fullName}
                </h1>
                <RatingStars
                  rating={ratingBreakdown?.averageRating ?? user.rating ?? 0}
                  totalReviews={ratingBreakdown?.totalReviews ?? user.totalReviews ?? 0}
                  breakdown={ratingBreakdown || undefined}
                  reviews={userReviews}
                  size="md"
                  showBreakdownToggle={true}
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono">{user.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono">{user.mobile}</span>
                </div>
                {user.preferredLocation && (
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{user.preferredLocation}</span>
                  </div>
                )}
              </div>

              {user.bio && (
                <p className="text-xs text-slate-300 italic pt-1 max-w-xl">
                  "{user.bio}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditingProfile(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Role-Specific Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {/* 1. GIG HOST TABS */}
        {user.role === 'GIG_HOST' && (
          <>
            <button
              onClick={() => setActiveTab('posted_gigs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'posted_gigs'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>My Posted Gigs</span>
              <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/60">
                {rawHostGigs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Host Overview</span>
            </button>
          </>
        )}

        {/* 2. TECH PARTNER TABS */}
        {user.role === 'TECH_PARTNER' && (
          <>
            <button
              onClick={() => setActiveTab('posted_services')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'posted_services'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>My Posted Services</span>
              <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/60">
                {techServices.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Earnings & Dual Wallet</span>
            </button>
          </>
        )}

        {/* 3. GIG PARTNER TABS (Read-Only Activity & Work History) */}
        {user.role === 'GIG_PARTNER' && (
          <>
            <button
              onClick={() => setActiveTab('work_history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'work_history'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>My Work History</span>
              <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/60">
                {rawWorkHistory.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Earnings Ledger</span>
            </button>
          </>
        )}

        {/* 4. SERVICE SEEKER TABS (Read-Only Booking History) */}
        {user.role === 'SERVICE_SEEKER' && (
          <>
            <button
              onClick={() => setActiveTab('booking_history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'booking_history'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>My Booking History</span>
              <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/60">
                {rawSeekerBookings.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Account Overview</span>
            </button>
          </>
        )}

        {/* Universal Reviews Tab */}
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'reviews'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Star className="w-4 h-4 text-amber-400" />
          <span>Verified Reviews</span>
          <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/60">
            {userReviews.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GIG HOST — MY POSTED GIGS (Editable Listings & Misuse Prevention) */}
      {/* ========================================================================= */}
      {user.role === 'GIG_HOST' && activeTab === 'posted_gigs' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-400 mb-2">
                <Briefcase className="w-3.5 h-3.5" />
                Gig Host Listings Management
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                My Posted Micro-Gigs
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                View all active, draft, and completed micro-gigs. Use <strong>[Edit Gig]</strong> to adjust descriptions, timing, required headcount, and base payout before worker confirmation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/host/post-gig')}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Post New Gig
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'PUBLISHED', 'DRAFT', 'FILLED', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setGigStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  gigStatusFilter === st
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                {st === 'ALL' ? 'All Gigs' : st}
              </button>
            ))}
          </div>

          {/* Gigs List */}
          {filteredHostGigs.length === 0 ? (
            <EmptyState
              title={gigStatusFilter === 'ALL' ? 'No Gigs Posted Yet' : `No ${gigStatusFilter} Gigs Found`}
              description="Your host ledger begins clean with zero pre-loaded records. Create your first micro-gig posting to hire flexible workers with escrow safety."
              actionText="Post First Gig"
              onAction={() => navigate('/host/post-gig')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredHostGigs.map((g) => {
                const isLocked = Boolean(
                  g.isLocked ||
                    g.status === 'IN_PROGRESS' ||
                    g.status === 'COMPLETED' ||
                    (g.confirmedWorkers || 0) > 0
                );

                return (
                  <div
                    key={g.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                              g.status === 'PUBLISHED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : g.status === 'FILLED'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : g.status === 'IN_PROGRESS'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : g.status === 'COMPLETED'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {g.status}
                          </span>

                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {g.category}
                          </span>

                          {/* Security Lock Badge */}
                          {isLocked ? (
                            <span
                              title="Editing is locked to prevent rate and headcount manipulation while workers are confirmed or shift is underway."
                              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" />
                              Locked — Active Escrow
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Unlock className="w-3 h-3" />
                              Editable — Open
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-black text-white">{g.title}</h3>
                        <p className="text-xs text-slate-300 line-clamp-2 max-w-3xl">
                          {g.description}
                        </p>
                      </div>

                      {/* Interactive Buttons */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedGigForEdit(g);
                            setIsGigEditOpen(true);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
                            isLocked
                              ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                              : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-600/20'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isLocked ? 'View Terms (Locked)' : 'Edit Gig'}</span>
                        </button>

                        <button
                          onClick={() => navigate(`/host/gigs/${g.id}`)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <span>Manage Shift</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Key Attributes Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          Schedule
                        </span>
                        <div className="font-bold text-white font-mono">{g.workDate}</div>
                        <div className="text-[10px] text-slate-400">
                          {g.shiftStartTime} - {g.shiftEndTime} ({g.customDuration || 'Flexible'})
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1">
                          <Users className="w-3 h-3 text-indigo-400" />
                          Worker Headcount
                        </span>
                        <div className="font-bold text-indigo-300 font-mono">
                          {g.confirmedWorkers || 0} / {g.requiredWorkers} Filled
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                ((g.confirmedWorkers || 0) / Math.max(1, g.requiredWorkers)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          Compensation & Escrow
                        </span>
                        <div className="font-bold text-emerald-400 font-mono">
                          ₹{g.paymentAmount} ({g.paymentBasis})
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Total Escrow: ₹{g.totalEscrowAmount || (g.paymentAmount * g.requiredWorkers * 1.05).toFixed(2)}
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          Work Location
                        </span>
                        <div className="font-bold text-white truncate">{g.workLocation}</div>
                        <div className="text-[10px] text-slate-400 truncate" title={g.fullAddress}>
                          {g.fullAddress}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================================== */}
      {/* TAB 2: TECH PARTNER — MY POSTED SERVICES (Editable Shift Rates, Overtime, Experience) */}
      {/* ===================================================================================== */}
      {user.role === 'TECH_PARTNER' && activeTab === 'posted_services' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-400 mb-2">
                <Wrench className="w-3.5 h-3.5" />
                Tech Partner Services Management
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                My Published Services
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage your service offerings, adjust shift rates (Half-Day, Full-Day, Overtime), experience details, and trade categories.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/tech/create-service')}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/30 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Publish New Service
              </button>
            </div>
          </div>

          {techServices.length === 0 ? (
            <EmptyState
              title="No Services Published Yet"
              description="Your technical service portfolio begins clean. Create a service listing to start receiving local customer requests within your 10–15 km operational radar."
              actionText="Publish Service Now"
              onAction={() => navigate('/tech/create-service')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {techServices.map((s) => {
                const isLocked = Boolean(
                  s.isLocked || (s.activeBookingsCount && s.activeBookingsCount > 0)
                );

                return (
                  <div
                    key={s.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                              s.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {s.isActive ? '● Active in Search' : '○ Inactive / Paused'}
                          </span>

                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {s.category}
                          </span>

                          {/* Security Lock Badge */}
                          {isLocked ? (
                            <span
                              title="Rates are locked because active customer appointments are in-progress with locked escrow funds."
                              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" />
                              Locked — Active Client Booking
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Unlock className="w-3 h-3" />
                              Editable — Rates Open
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-black text-white">{s.title}</h3>
                        <p className="text-xs text-slate-300 line-clamp-2 max-w-3xl">
                          {s.description}
                        </p>
                      </div>

                      {/* Interactive Edit Button */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedServiceForEdit(s);
                            setIsServiceEditOpen(true);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border ${
                            isLocked
                              ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                              : 'bg-amber-600/20 hover:bg-amber-600/30 border-amber-500/40 text-amber-300 shadow-md shadow-amber-600/20'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isLocked ? 'View Rates (Locked)' : 'Edit Service'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Shift Rates & Experience Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                          Base / Hourly Rate
                        </span>
                        <div className="font-bold text-emerald-400 font-mono text-sm">
                          ₹{s.price}
                        </div>
                        <div className="text-[10px] text-slate-400">Baseline diagnostic</div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                          Half-Day Shift (4h)
                        </span>
                        <div className="font-bold text-amber-400 font-mono text-sm">
                          {s.halfDayPrice ? `₹${s.halfDayPrice}` : 'Unspecified'}
                        </div>
                        <div className="text-[10px] text-slate-400">4-hour appointment</div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                          Full-Day Shift (8h)
                        </span>
                        <div className="font-bold text-amber-400 font-mono text-sm">
                          {s.fullDayPrice ? `₹${s.fullDayPrice}` : 'Unspecified'}
                        </div>
                        <div className="text-[10px] text-slate-400">8-hour complete slot</div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                          Overtime Rate
                        </span>
                        <div className="font-bold text-cyan-400 font-mono text-sm">
                          {s.overtimeHourlyRate ? `₹${s.overtimeHourlyRate}/hr` : 'Standard Hourly'}
                        </div>
                        <div className="text-[10px] text-slate-400">Post-shift extension</div>
                      </div>
                    </div>

                    {/* Additional Skills & Area Info */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-850">
                      <div className="flex items-center gap-4">
                        {s.experienceYears && (
                          <div className="flex items-center gap-1 text-slate-300">
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                            <span>{s.experienceYears} Years Experience</span>
                          </div>
                        )}
                        {s.skills && (
                          <div className="text-[11px] text-slate-400">
                            Skills: <span className="text-slate-300">{s.skills}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>Coverage: {s.serviceAreaCoverage || s.serviceArea} ({s.operatingRadiusKm || 10} km radar)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GIG PARTNER — MY WORK HISTORY (Strictly Read-Only Activity History) */}
      {/* ========================================================================= */}
      {user.role === 'GIG_PARTNER' && activeTab === 'work_history' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-400 mb-2">
                <FileText className="w-3.5 h-3.5" />
                Gig Partner Work History & Audit Log
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                My Shift Work History & Earnings
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Verified historical log of completed micro-gigs, geofenced GPS check-in/out timestamps, wallet earnings releases, and ratings received from Gig Hosts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/partner/browse')}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
              >
                <span>Browse Nearby Gigs</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'COMPLETED', 'IN_PROGRESS', 'WAITLISTED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setWorkHistoryFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  workHistoryFilter === filter
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                {filter === 'ALL'
                  ? 'All Shifts'
                  : filter === 'COMPLETED'
                  ? 'Completed & Paid'
                  : filter === 'IN_PROGRESS'
                  ? 'Confirmed / In-Progress'
                  : 'Waitlisted'}
              </button>
            ))}
          </div>

          {filteredWorkHistory.length === 0 ? (
            <EmptyState
              title="No Work History on Record"
              description="Your shift history begins completely fresh. Explore available micro-gigs within your 10 to 15 km radar to start booking and logging verified work."
              actionText="Explore Gigs Now"
              onAction={() => navigate('/partner/browse')}
            />
          ) : (
            <div className="space-y-4">
              {filteredWorkHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            item.isCompleted || item.attendance?.hostApproved
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.status === 'APPROVED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : item.status === 'WAITLISTED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.isCompleted || item.attendance?.hostApproved
                            ? 'COMPLETED & PAID'
                            : item.status === 'APPROVED'
                            ? 'CONFIRMED SLOT'
                            : item.status}
                          {item.waitlistPosition ? ` #${item.waitlistPosition}` : ''}
                        </span>

                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.gigCategory || 'Micro-Gig'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white">{item.gigTitle}</h3>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Host: <strong className="text-slate-300">{item.hostName || 'Gig Employer'}</strong></span>
                        <span>•</span>
                        <span>Scheduled: {item.workDate || 'As agreed'}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-500">Gross Payout</div>
                      <div className="text-lg font-black text-emerald-400 font-mono">
                        ₹{item.payoutAmount || item.paymentAmount}
                      </div>
                    </div>
                  </div>

                  {/* Work Logs & Geofence Verification */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        GPS Geofence Check-In
                      </span>
                      {item.attendance?.checkInTime ? (
                        <div className="space-y-0.5 mt-0.5">
                          <div className="font-bold text-emerald-400 font-mono text-[11px]">
                            {new Date(item.attendance.checkInTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.attendance.distanceCheckInMeters !== undefined
                              ? `${item.attendance.distanceCheckInMeters}m from anchor (Geofence OK)`
                              : 'On-site verified'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic mt-0.5 block">Pending Check-In</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        GPS Geofence Check-Out
                      </span>
                      {item.attendance?.checkOutTime ? (
                        <div className="space-y-0.5 mt-0.5">
                          <div className="font-bold text-emerald-400 font-mono text-[11px]">
                            {new Date(item.attendance.checkOutTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Duration: {item.attendance.claimedDuration || 'Logged'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic mt-0.5 block">Not Checked Out</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        Host Verification & Escrow
                      </span>
                      {item.attendance?.hostApproved ? (
                        <div className="text-emerald-400 font-bold flex items-center gap-1 mt-1 text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approved & Released to Wallet</span>
                        </div>
                      ) : item.attendance?.status === 'CHECKED_OUT' ? (
                        <div className="text-amber-400 font-bold flex items-center gap-1 mt-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Awaiting Host Sign-Off</span>
                        </div>
                      ) : (
                        <div className="text-slate-400 mt-1 text-[11px]">
                          Escrow Protected Vault
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rating Received from Host */}
                  {item.hostReview && (
                    <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-300">Host Review:</span>
                        <span className="text-slate-400 italic">"{item.hostReview.comment}"</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <span>{item.hostReview.rating}</span>
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 4: SERVICE SEEKER — MY BOOKING HISTORY (Strictly Read-Only Appointment Logs) */}
      {/* ============================================================================== */}
      {user.role === 'SERVICE_SEEKER' && activeTab === 'booking_history' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400 mb-2">
                <Calendar className="w-3.5 h-3.5" />
                Service Seeker Appointment History
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                My Booking History & Escrow Receipts
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Inspect past technician appointments, assigned professionals, payments held in secure escrow, and release logs.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/seeker/search')}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition cursor-pointer"
              >
                <span>Find Tech Partners</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'ACTIVE', 'COMPLETED', 'DISPUTED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setBookingHistoryFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  bookingHistoryFilter === filter
                    ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                {filter === 'ALL'
                  ? 'All Bookings'
                  : filter === 'ACTIVE'
                  ? 'Active / Upcoming'
                  : filter === 'COMPLETED'
                  ? 'Completed'
                  : 'Disputed'}
              </button>
            ))}
          </div>

          {filteredSeekerBookings.length === 0 ? (
            <EmptyState
              title="No Appointments on Record"
              description="Your customer appointment ledger is clean and empty. Search verified technicians within your 10 to 15 km area to schedule home or office service."
              actionText="Find Local Technicians"
              onAction={() => navigate('/seeker/search')}
            />
          ) : (
            <div className="space-y-4">
              {filteredSeekerBookings.map((b: any) => (
                <div
                  key={b.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            b.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : b.status === 'IN_PROGRESS' || b.status === 'CONFIRMED'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              : b.status === 'DISPUTED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {b.status}
                        </span>

                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {b.category || 'Local Service'}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          Payment: {b.paymentStatus || 'ESCROW_LOCKED'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white">{b.serviceTitle}</h3>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Technician: <strong className="text-slate-300">{b.techPartnerName}</strong></span>
                        <span>•</span>
                        <span>Date: {b.serviceDate || b.bookingDate}</span>
                        <span>•</span>
                        <span>Time: {b.preferredTime || b.timeSlot}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-500">Total Settled</div>
                      <div className="text-lg font-black text-emerald-400 font-mono">
                        ₹{b.finalAmount || b.price || b.halfDayPrice || '0'}
                      </div>
                    </div>
                  </div>

                  {/* Location & Status Info */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{b.serviceLocation || b.serviceAddress || 'Customer Address'}</span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {b.status === 'COMPLETED'
                        ? 'Escrow released upon your verified completion approval'
                        : 'Escrow protected by TaskHub until you sign off on work'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: OVERVIEW (Metrics, Ledgers, Performance Stats) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Role-Specific Metric Ledger */}
          {(user.role === 'GIG_PARTNER' || user.role === 'TECH_PARTNER') && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Completed Works
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {user.role === 'GIG_PARTNER'
                    ? stats.completedShifts || 0
                    : stats.completedBookings || 0}
                </div>
                <div className="text-[11px] text-slate-500">
                  {user.role === 'GIG_PARTNER'
                    ? `${stats.pendingApprovalShifts || 0} awaiting host sign-off`
                    : `${stats.inProgressBookings || 0} currently in progress`}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Total Gross Earnings
                </span>
                <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
                  ₹{(stats.totalEarnings || 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500">
                  ₹{(stats.availableBalance || 0).toFixed(2)} available withdrawable
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Active Engagements
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {user.role === 'GIG_PARTNER'
                    ? (stats.approvedApplications || 0) + (stats.waitlistedApplications || 0)
                    : stats.totalBookings || 0}
                </div>
                <div className="text-[11px] text-slate-500">
                  {user.role === 'GIG_PARTNER'
                    ? `${stats.waitlistedApplications || 0} on railway waitlists`
                    : `${stats.totalServices || 0} published service listings`}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Performance Rating
                </span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 flex items-center gap-1.5">
                  <span>{(ratingBreakdown?.averageRating ?? user.rating ?? 0).toFixed(1)}</span>
                  <Star className="w-5 h-5 fill-current text-amber-400" />
                </div>
                <div className="text-[11px] text-slate-500">
                  {ratingBreakdown?.totalReviews ?? user.totalReviews ?? 0} verified review{(ratingBreakdown?.totalReviews ?? user.totalReviews) === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          )}

          {(user.role === 'GIG_HOST' || user.role === 'SERVICE_SEEKER') && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  {user.role === 'GIG_HOST' ? 'Total Posted Gigs' : 'Total Service Bookings'}
                </span>
                <div className="text-2xl sm:text-3xl font-black text-indigo-400">
                  {user.role === 'GIG_HOST' ? stats.totalPostedGigs || 0 : stats.totalBookings || 0}
                </div>
                <div className="text-[11px] text-slate-500">
                  {user.role === 'GIG_HOST'
                    ? `${stats.activeGigs || 0} currently active`
                    : `${stats.activeBookings || 0} active appointments`}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Successful Fulfillments
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {user.role === 'GIG_HOST' ? stats.completedGigs || 0 : stats.completedBookings || 0}
                </div>
                <div className="text-[11px] text-slate-500">
                  {user.role === 'GIG_HOST'
                    ? `${stats.totalConfirmedWorkers || 0} workers hired`
                    : 'Escrow released upon completion'}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Expenditure Ledger
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  ₹{(stats.totalSpent || 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500">Total settled & escrow locked</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Active Engagements
                </span>
                <div className="text-2xl sm:text-3xl font-black text-cyan-400">
                  {user.role === 'GIG_HOST' ? stats.activeGigs || 0 : stats.activeBookings || 0}
                </div>
                <div className="text-[11px] text-slate-500">0 Disputes / 100% Satisfaction</div>
              </div>
            </div>
          )}

          {/* Targeted Achievements */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Verified Milestones & Trust Signals
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Dual Verification</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Account phone and email identity verified via secure dual-channel OTP protocols.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Escrow Safeguards</span>
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  100% financial integrity guaranteed. Payments held in secure escrow vaults until approved.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Geofenced Attendance</span>
                  <MapPin className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  On-site check-in / check-out calibrated within a strict 200m radius of job premises.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: REVIEWS (Verified Ratings & Breakdown) */}
      {/* ========================================================================= */}
      {activeTab === 'reviews' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-400 mb-2">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                Verified Counter-Party Ratings & Reviews
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Authentic Performance Reviews
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Reviews can only be submitted upon task completion or escrow payment settlement. Average rating calculated with pure arithmetic mean.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div className="text-3xl font-black text-amber-400 font-mono">
                {(ratingBreakdown?.averageRating ?? user.rating ?? 0).toFixed(1)}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(ratingBreakdown?.averageRating ?? user.rating ?? 0)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {ratingBreakdown?.totalReviews ?? user.totalReviews ?? 0} verified review{(ratingBreakdown?.totalReviews ?? user.totalReviews) === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          </div>

          {/* Rating Breakdown Bar Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Rating Distribution
              </h4>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingBreakdown?.starCounts[stars as 1 | 2 | 3 | 4 | 5] || 0;
                const pct = ratingBreakdown?.starPercentages[stars as 1 | 2 | 3 | 4 | 5] || 0;
                return (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <span className="w-8 font-bold text-slate-300">{stars} ★</span>
                    <div className="flex-1 h-2.5 bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stars >= 4 ? 'bg-emerald-500' : stars === 3 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-[11px] text-slate-400">
                      {pct}% ({count})
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Fraud & Self-Review Protection</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                TaskHub guarantees rating integrity: Self-reviews, unverified submissions, and bot manipulation are strictly filtered. Every review is tied to an escrow-settled task ID or approved attendance geofence log.
              </p>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Recent Counter-Party Reviews
            </h4>

            {userReviews.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 italic bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                No counter-party reviews on record yet. Complete your first task or engagement to receive verified reviews!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userReviews.map((r) => (
                  <div key={r.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{r.reviewerName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {r.reviewerRole.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center gap-1">
                        {r.rating} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </span>
                    </div>

                    {r.jobTitle && (
                      <div className="text-[11px] text-indigo-400 font-mono">
                        Task: {r.jobTitle}
                      </div>
                    )}

                    <p className="text-xs text-slate-300 italic">"{r.comment}"</p>

                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Information Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                Update Profile Information
              </h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Operating Locality / Preferred Location
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Indiranagar, Bangalore"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Professional Bio / Description
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Brief summary of your skills, background, or organization..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {saveProfileMsg && (
                <div className="text-xs p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  {saveProfileMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Gig Modal (Gig Host) */}
      {isGigEditOpen && selectedGigForEdit && (
        <EditGigModal
          isOpen={isGigEditOpen}
          gig={selectedGigForEdit}
          onClose={() => {
            setIsGigEditOpen(false);
            setSelectedGigForEdit(null);
          }}
          onGigUpdated={handleGigUpdated}
        />
      )}

      {/* Edit Service Modal (Tech Partner) */}
      {isServiceEditOpen && selectedServiceForEdit && (
        <EditServiceModal
          isOpen={isServiceEditOpen}
          service={selectedServiceForEdit}
          onClose={() => {
            setIsServiceEditOpen(false);
            setSelectedServiceForEdit(null);
          }}
          onServiceUpdated={handleServiceUpdated}
        />
      )}
    </div>
  );
};
