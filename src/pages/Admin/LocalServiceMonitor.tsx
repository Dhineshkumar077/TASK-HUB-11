import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  Layers,
  Clock,
  Timer,
  MapPin,
  Sparkles,
  Eye,
  X,
  FileText,
  Search,
  Filter,
  CreditCard,
  UserCheck,
  Navigation,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { User, ServiceListing, ServiceBooking, FinancialLedgerEntry } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';

interface LocalServiceMonitorProps {
  navigate: (path: string) => void;
}

export const LocalServiceMonitor: React.FC<LocalServiceMonitorProps> = ({ navigate }) => {
  const { lastEvent } = useRealtime();
  const [activeTab, setActiveTab] = useState<'users' | 'services' | 'bookings' | 'revenue'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [ledger, setLedger] = useState<FinancialLedgerEntry[]>([]);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Time Logs & Booking Audit Modal State
  const [auditBooking, setAuditBooking] = useState<ServiceBooking | null>(null);
  const [bookingFilter, setBookingFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      const [usersRes, servicesRes, bookingsRes, revenueRes] = await Promise.all([
        api.getAdminLocalUsers(),
        api.getAdminServices(),
        api.getAdminBookings(),
        api.getAdminRevenueReports(),
      ]);
      setUsers(usersRes.users || []);
      setServices(servicesRes.services || []);
      setBookings(bookingsRes.bookings || []);
      setLedger(bookingsRes.ledger || []);
      setRevenueData(revenueRes || {});
    } catch (err) {
      console.error('Failed to load local service monitor:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lastEvent?.timestamp]);

  const handleToggleService = async (serviceId: string) => {
    try {
      const res = await api.toggleAdminService(serviceId);
      setActionMessage(res.message);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Toggle failed.');
    }
  };

  const handleUpdateStatus = async (user: User, newStatus: string) => {
    try {
      await api.updateUserStatus(user.id, {
        status: newStatus,
        reason: newStatus !== 'ACTIVE' ? 'Administrative review' : undefined,
      });
      setActionMessage(`User account status updated to ${newStatus}.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    }
  };

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    // Status filter
    if (bookingFilter === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return false;
    if (bookingFilter === 'AWAITING_TOPUP' && b.status !== 'AWAITING_BALANCE_TOPUP') return false;
    if (bookingFilter === 'COMPLETED' && (!b.checkOutTime || b.customerApproved)) return false;
    if (bookingFilter === 'APPROVED' && !b.customerApproved) return false;
    if (bookingFilter === 'EXTENDED' && !b.isExtended) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = b.id.toLowerCase().includes(q);
      const matchService = b.serviceTitle?.toLowerCase().includes(q);
      const matchCustomer = b.seekerName?.toLowerCase().includes(q);
      const matchTech = b.techPartnerName?.toLowerCase().includes(q);
      const matchCategory = b.category?.toLowerCase().includes(q);
      return matchId || matchService || matchCustomer || matchTech || matchCategory;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Master Admin Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Wrench className="w-7 h-7 text-cyan-400" />
            Local Service Marketplace Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Governance sub-portal for technician listings, geofenced time logs, hourly overtime / shift extensions, and escrow settlement audits.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-800 gap-2">
        {[
          { id: 'users', label: `Users (${users.length})` },
          { id: 'services', label: `Service Listings (${services.length})` },
          { id: 'bookings', label: `Booking & Time Logs Monitor (${bookings.length})` },
          { id: 'revenue', label: 'Revenue Reports' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === t.id
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">User Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">{u.fullName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-cyan-300">
                        {u.role.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{u.email}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{u.mobile}</td>
                      <td className="py-3 px-4 text-amber-400 font-bold">★ {u.rating.toFixed(1)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUpdateStatus(u, 'SUSPENDED')}
                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold border border-rose-500/20 transition cursor-pointer"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(u, 'ACTIVE')}
                            className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20 transition cursor-pointer"
                          >
                            Reinstate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Service Listings */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Service Title</th>
                    <th className="py-3 px-4">Tech Partner</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Pricing</th>
                    <th className="py-3 px-4">Service Area</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">{s.title}</td>
                      <td className="py-3 px-4 text-slate-300">{s.techPartnerName}</td>
                      <td className="py-3 px-4 font-mono text-cyan-300">{s.category}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-bold">₹{s.price} ({s.pricingBasis})</td>
                      <td className="py-3 px-4 text-slate-400">{s.serviceArea}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            s.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {s.isActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleService(s.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition border cursor-pointer ${
                            s.isActive
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          {s.isActive ? 'Disable Listing' : 'Restore Listing'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Booking & Time Logs Monitor */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-2">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                Status Filter:
              </span>
              {[
                { id: 'ALL', label: 'All Bookings' },
                { id: 'IN_PROGRESS', label: 'In Progress' },
                { id: 'AWAITING_TOPUP', label: 'Awaiting Balance' },
                { id: 'EXTENDED', label: 'Extensions / Overtime' },
                { id: 'APPROVED', label: 'Approved & Settled' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setBookingFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    bookingFilter === f.id
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search booking, user, service..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4 font-sans">Service & Category</th>
                    <th className="py-3 px-4 font-sans">Customer & Technician</th>
                    <th className="py-3 px-4 font-sans">Time Logs (Check-In / Out)</th>
                    <th className="py-3 px-4 font-sans">Extension & Overtime</th>
                    <th className="py-3 px-4 font-sans">Financial Settlement</th>
                    <th className="py-3 px-4 font-sans">Status</th>
                    <th className="py-3 px-4 font-sans">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                        No bookings match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition">
                        {/* Ref & Shift */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-cyan-400 font-bold block">
                            {b.id.slice(0, 8)}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {b.shiftType || 'Shift Booking'}
                          </span>
                        </td>

                        {/* Service Title */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-white max-w-[180px] truncate">
                            {b.serviceTitle}
                          </div>
                          <span className="text-[10px] font-mono text-cyan-300">
                            {b.category}
                          </span>
                        </td>

                        {/* Customer & Tech */}
                        <td className="py-3 px-4">
                          <div className="text-white text-xs font-semibold">
                            Seeker: {b.seekerName}
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Tech: {b.techPartnerName}
                          </div>
                        </td>

                        {/* Database Time Logs */}
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {b.checkInTime ? (
                            <div className="space-y-0.5">
                              <div className="text-cyan-300">
                                <strong>In:</strong> {new Date(b.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {b.checkInDistanceMeters !== undefined && (
                                  <span className="text-[10px] text-slate-400 ml-1">({b.checkInDistanceMeters}m)</span>
                                )}
                              </div>
                              {b.checkOutTime ? (
                                <div className="text-emerald-300">
                                  <strong>Out:</strong> {new Date(b.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  <span className="text-[10px] text-slate-300 ml-1 font-bold font-sans">
                                    ({b.loggedDurationHours ?? b.baseDurationHours}h)
                                  </span>
                                </div>
                              ) : (
                                <div className="text-amber-400 text-[10px] animate-pulse">
                                  ● Working on Site
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Not Checked In</span>
                          )}
                        </td>

                        {/* Extension / Overtime */}
                        <td className="py-3 px-4">
                          {b.isExtended ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                {b.extensionChoice === 'SHIFT_EXTENSION'
                                  ? 'Full-Day Upgrade'
                                  : `Overtime (+${b.extraHoursWorked ?? b.overtimeHours ?? 1}h)`}
                              </span>
                              {b.extensionChoice === 'EXTRA_HOURS' && b.customHourlyRate && (
                                <div className="text-[10px] font-mono text-slate-300">
                                  @ ₹{b.customHourlyRate}/hr = ₹{b.overtimeAmount}
                                </div>
                              )}
                              {b.extensionChoice === 'SHIFT_EXTENSION' && (
                                <div className="text-[10px] font-mono text-cyan-300">
                                  Upgrade wage: ₹{b.overtimeAmount}
                                </div>
                              )}
                            </div>
                          ) : b.checkOutTime ? (
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              Standard ({b.baseDurationHours || 4}h)
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Financial Settlement */}
                        <td className="py-3 px-4">
                          <div className="font-mono text-emerald-400 font-bold">
                            Base: ₹{b.baseEscrowAmount || b.servicePrice}
                          </div>
                          {b.isExtended && b.postpaidBalanceAmount ? (
                            <div className="text-[10px] font-mono text-amber-300 mt-0.5">
                              Postpaid: +₹{b.postpaidBalanceAmount} ({b.postpaidBalancePaid ? 'Cleared' : 'Pending'})
                            </div>
                          ) : null}
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {b.customerApproved
                              ? 'Escrow Released'
                              : b.paymentStatus === 'ESCROW_LOCKED'
                              ? 'Escrow Locked'
                              : b.paymentStatus}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border block text-center ${
                              b.customerApproved
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : b.status === 'AWAITING_BALANCE_TOPUP'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                : b.status === 'IN_PROGRESS'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : b.status === 'CONFIRMED'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {b.customerApproved ? 'APPROVED' : b.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Audit Action */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setAuditBooking(b)}
                            className="px-2.5 py-1 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            Audit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Revenue Reports */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Total Marketplace Volume
              </span>
              <div className="text-2xl font-mono font-black text-white">
                ₹{revenueData?.metrics?.totalVolume?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Platform Commission (8%)
              </span>
              <div className="text-2xl font-mono font-black text-emerald-400">
                ₹{revenueData?.metrics?.totalPlatformFees?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Pending Escrow Settlements
              </span>
              <div className="text-2xl font-mono font-black text-indigo-400">
                ₹{revenueData?.metrics?.pendingSettlement?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Completed Settlements
              </span>
              <div className="text-2xl font-mono font-black text-cyan-400">
                ₹{revenueData?.metrics?.totalSettled?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Revenue Breakdown by Category
            </h3>
            {revenueData?.categoryBreakdown && Object.keys(revenueData.categoryBreakdown).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(revenueData.categoryBreakdown).map(([cat, stats]: any) => (
                  <div key={cat} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-white text-xs">{cat}</div>
                    <div className="text-[11px] text-slate-400">Bookings: {stats.count}</div>
                    <div className="text-[11px] text-emerald-400 font-mono">Commission: ₹{stats.revenue.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No revenue categorized yet.</p>
            )}
          </div>
        </div>
      )}

      {/* COMPREHENSIVE TIME LOGS & ESCROW SETTLEMENT AUDIT MODAL */}
      {auditBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-cyan-500/40 max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden relative my-6">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Audit Time Logs & Settlement</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {auditBooking.id.slice(0, 10)}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">{auditBooking.serviceTitle} • {auditBooking.category}</p>
                </div>
              </div>

              <button
                onClick={() => setAuditBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Parties & Scheduled Details */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Service Seeker (Customer)</span>
                  <div className="font-bold text-white text-sm mt-0.5">{auditBooking.seekerName}</div>
                  <div className="font-mono text-slate-400">{auditBooking.seekerMobile}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tech Partner (Technician)</span>
                  <div className="font-bold text-cyan-300 text-sm mt-0.5">{auditBooking.techPartnerName}</div>
                  <div className="font-mono text-slate-400">{auditBooking.techPartnerMobile}</div>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-slate-300">
                  <span>Scheduled: <strong className="text-white font-mono">{auditBooking.serviceDate} • {auditBooking.preferredTime}</strong></span>
                  <span>Base Shift Tier: <strong className="text-cyan-300">{auditBooking.shiftType || 'Half-Day Shift'}</strong></span>
                </div>
              </div>

              {/* Exact Database Time Logs & GPS Geofence Audit */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>On-Site Attendance & Time Logs Audit</span>
                </h4>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Check-In */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">1. Check-In (Job Start)</span>
                      {auditBooking.checkInTime ? (
                        <>
                          <div className="text-white font-mono font-bold text-sm">
                            {new Date(auditBooking.checkInTime).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>GPS Geofence: {auditBooking.checkInDistanceMeters ?? 0}m from customer pin (≤50m OK)</span>
                          </div>
                          {auditBooking.checkInLatitude && (
                            <div className="text-[10px] font-mono text-slate-500">
                              Lat: {auditBooking.checkInLatitude.toFixed(6)}, Lng: {auditBooking.checkInLongitude?.toFixed(6)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-slate-500 italic">Not checked in yet</div>
                      )}
                    </div>

                    {/* Check-Out */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">2. Check-Out (Job End)</span>
                      {auditBooking.checkOutTime ? (
                        <>
                          <div className="text-white font-mono font-bold text-sm">
                            {new Date(auditBooking.checkOutTime).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>GPS Geofence: {auditBooking.checkOutDistanceMeters ?? 0}m from customer pin (≤50m OK)</span>
                          </div>
                          {auditBooking.checkOutLatitude && (
                            <div className="text-[10px] font-mono text-slate-500">
                              Lat: {auditBooking.checkOutLatitude.toFixed(6)}, Lng: {auditBooking.checkOutLongitude?.toFixed(6)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-amber-400 italic">Job currently in progress</div>
                      )}
                    </div>
                  </div>

                  {auditBooking.checkOutTime && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-300">
                      <span>Total Logged Duration Elapsed:</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {auditBooking.loggedDurationMinutes ?? 0} mins ({auditBooking.loggedDurationHours ?? 0} hrs)
                      </span>
                    </div>
                  )}

                  {auditBooking.workNotes && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold mb-0.5">Technician Summary Notes:</span>
                      <div className="p-2.5 rounded-xl bg-slate-900 text-slate-300 text-xs italic border border-slate-800">
                        "{auditBooking.workNotes}"
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Extension & Hourly Overtime Audit */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Extension Choice & Overtime Breakdown</span>
                </h4>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Selected Extension Option:</span>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono border bg-slate-900 text-white border-slate-700">
                      {auditBooking.extensionChoice === 'EXTRA_HOURS'
                        ? 'EXTRA HOURS (HOURLY OVERTIME)'
                        : auditBooking.extensionChoice === 'SHIFT_EXTENSION'
                        ? 'SHIFT EXTENSION (CONVERT TO FULL-DAY)'
                        : 'STANDARD COMPLETION (NO EXTRA WORK)'}
                    </span>
                  </div>

                  {auditBooking.extensionChoice === 'EXTRA_HOURS' && (
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span>Manual Overtime Input:</span>
                        <span className="font-mono font-bold text-white">+{auditBooking.extraHoursWorked ?? auditBooking.overtimeHours ?? 1} extra hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Technician Defined Hourly Rate:</span>
                        <span className="font-mono font-bold text-white">₹{auditBooking.customHourlyRate ?? auditBooking.hourlyRate ?? 250}/hr</span>
                      </div>
                      <div className="flex justify-between text-amber-300 font-bold pt-1 border-t border-amber-500/20">
                        <span>Overtime Wage Payable to Tech:</span>
                        <span className="font-mono">₹{auditBooking.overtimeAmount ?? 250}</span>
                      </div>
                    </div>
                  )}

                  {auditBooking.extensionChoice === 'SHIFT_EXTENSION' && (
                    <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span>Extension Type:</span>
                        <span className="font-mono font-bold text-white">
                          {auditBooking.shiftExtensionType === 'SECOND_HALF_DAY' ? 'Second Half-Day (+4 hrs)' : 'Full-Day (8 hrs)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Base Half-Day Paid:</span>
                        <span className="font-mono text-emerald-400">₹{auditBooking.halfDayPrice || auditBooking.servicePrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Defined Full-Day Listing Price:</span>
                        <span className="font-mono text-white">₹{auditBooking.fullDayPrice || Math.round(auditBooking.servicePrice * 1.8)}</span>
                      </div>
                      <div className="flex justify-between text-cyan-300 font-bold pt-1 border-t border-cyan-500/20">
                        <span>Remaining Wage Difference Payable:</span>
                        <span className="font-mono">₹{auditBooking.overtimeAmount}</span>
                      </div>
                    </div>
                  )}

                  {auditBooking.extensionReason && (
                    <div className="text-[11px] text-slate-300 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <strong>Audit Log Explanation:</strong> {auditBooking.extensionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Escrow & Postpaid Balance Clearance */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Escrow & Postpaid Balance Settlement</span>
                </h4>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
                  <div className="flex justify-between text-slate-300">
                    <span>1. Initial Base Escrow Deposited & Locked:</span>
                    <span className="font-mono font-bold text-emerald-400">₹{auditBooking.baseEscrowAmount || auditBooking.servicePrice}</span>
                  </div>

                  {auditBooking.isExtended && auditBooking.postpaidBalanceAmount ? (
                    <div className="flex justify-between text-slate-300">
                      <span>2. Postpaid Balance Amount:</span>
                      <span className="font-mono font-bold text-amber-300">₹{auditBooking.postpaidBalanceAmount}</span>
                    </div>
                  ) : null}

                  {auditBooking.isExtended && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Postpaid Balance Clearance Status:</span>
                      <span className={`font-mono font-bold ${auditBooking.postpaidBalancePaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {auditBooking.postpaidBalancePaid ? 'CLEARED & LOCKED IN ESCROW' : 'PENDING PAYMENT FROM SEEKER'}
                      </span>
                    </div>
                  )}

                  {auditBooking.postpaidBalancePaidAt && (
                    <div className="text-[11px] text-slate-400 flex justify-between font-mono">
                      <span>Balance Cleared At:</span>
                      <span>{new Date(auditBooking.postpaidBalancePaidAt).toLocaleString()} ({auditBooking.postpaidBalanceTxnId})</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-slate-300">
                    <span className="font-semibold">Final Customer Approval & Escrow Release:</span>
                    <span className={`font-bold font-mono px-2.5 py-0.5 rounded text-xs ${
                      auditBooking.customerApproved
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {auditBooking.customerApproved ? 'WORK APPROVED & ESCROW RELEASED' : 'PENDING FINAL APPROVAL'}
                    </span>
                  </div>

                  {auditBooking.customerApprovedAt && (
                    <div className="text-[11px] text-emerald-400 flex justify-between font-mono">
                      <span>Released At:</span>
                      <span>{new Date(auditBooking.customerApprovedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Financial Ledger Entries */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>Linked Financial Ledger Transactions</span>
                </h4>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  {(() => {
                    const linked = ledger.filter((l) => l.bookingId === auditBooking.id);
                    if (linked.length === 0) {
                      return <div className="text-slate-500 italic py-2 text-center">No ledger entries generated yet.</div>;
                    }
                    return linked.map((entry) => (
                      <div key={entry.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{entry.title}</div>
                          <div className="font-mono text-slate-400 text-[10px]">{entry.transactionId} • {entry.paymentProvider}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-emerald-400">₹{entry.grossAmount}</div>
                          <div className={`text-[10px] font-bold ${
                            entry.escrowStatus === 'RELEASED_TO_PARTNER' ? 'text-emerald-400' : 'text-cyan-400'
                          }`}>
                            {entry.escrowStatus}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setAuditBooking(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
