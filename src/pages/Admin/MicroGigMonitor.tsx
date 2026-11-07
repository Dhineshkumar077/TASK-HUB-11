import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Clock,
  AlertTriangle,
  Send,
  CheckCircle,
  XCircle,
  DollarSign,
  ArrowLeft,
  ShieldAlert,
  Search,
  Sliders,
  Save,
  RefreshCw,
  Percent,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';
import { User, DelayedApprovalWarning, FinancialLedgerEntry, PlatformSettings } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';

interface MicroGigMonitorProps {
  navigate: (path: string) => void;
}

export const MicroGigMonitor: React.FC<MicroGigMonitorProps> = ({ navigate }) => {
  const { lastEvent } = useRealtime();
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'delayed' | 'ledger' | 'commission'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [delayedApprovals, setDelayedApprovals] = useState<DelayedApprovalWarning[]>([]);
  const [ledger, setLedger] = useState<FinancialLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Platform Commission Settings state
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    microGigTier1MaxMembers: 5,
    microGigTier1FeePercentage: 10,
    microGigTier2FeePercentage: 5,
    localServiceCommissionPercentage: 10,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState<string | null>(null);
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<string | null>(null);

  // Simulation test calculator state
  const [simWorkers, setSimWorkers] = useState(4);
  const [simBudget, setSimBudget] = useState(5000);

  // Suspension modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [usersRes, jobsRes, delayedRes, ledgerRes, settingsRes] = await Promise.all([
        api.getAdminMicroGigUsers(),
        api.getAdminJobs(),
        api.getAdminDelayedApprovals(),
        api.getAdminEscrowLedger(),
        api.getAdminCommissionSettings().catch(() => ({ settings: null })),
      ]);
      setUsers(usersRes.users || []);
      setJobs(jobsRes.jobs || []);
      setDelayedApprovals(delayedRes.delayedApprovals || []);
      setLedger(ledgerRes.ledger || []);
      if (settingsRes?.settings) {
        setPlatformSettings(settingsRes.settings);
      }
    } catch (err) {
      console.error('Failed to load micro-gig admin monitor:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lastEvent?.timestamp]);

  const handleUpdateStatus = async (user: User, newStatus: string) => {
    try {
      await api.updateUserStatus(user.id, {
        status: newStatus,
        reason: newStatus !== 'ACTIVE' ? suspensionReason || 'Administrative review' : undefined,
      });
      setActionMessage(`User account status updated to ${newStatus}.`);
      setSelectedUser(null);
      setSuspensionReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    }
  };

  const handleSendReminder = async (gigId: string, partnerId: string) => {
    try {
      const res = await api.sendDelayedReminder(gigId, partnerId);
      setActionMessage(res.message);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch reminder.');
    }
  };

  const handleSaveCommissionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMessage(null);
    setSettingsErrorMessage(null);
    try {
      const res = await api.updateAdminCommissionSettings({
        microGigTier1MaxMembers: Number(platformSettings.microGigTier1MaxMembers),
        microGigTier1FeePercentage: Number(platformSettings.microGigTier1FeePercentage),
        microGigTier2FeePercentage: Number(platformSettings.microGigTier2FeePercentage),
        localServiceCommissionPercentage: Number(platformSettings.localServiceCommissionPercentage),
      });
      setSettingsSuccessMessage(res.message || 'Commission settings updated successfully and applied dynamically!');
      if (res.settings) {
        setPlatformSettings(res.settings);
      }
    } catch (err: any) {
      setSettingsErrorMessage(err.message || 'Failed to update commission settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetCommissionSettings = () => {
    setPlatformSettings({
      microGigTier1MaxMembers: 5,
      microGigTier1FeePercentage: 10,
      microGigTier2FeePercentage: 5,
      localServiceCommissionPercentage: 10,
    });
    setSettingsSuccessMessage('Reset to platform defaults (1-5: 10%, >5: 5%, Local Services: 10%). Click Save to commit.');
  };

  // Simulation calculations
  const simTierRate = simWorkers <= (platformSettings.microGigTier1MaxMembers || 5)
    ? platformSettings.microGigTier1FeePercentage
    : platformSettings.microGigTier2FeePercentage;
  const simPlatformFee = Math.round(((simBudget * simTierRate) / 100) * 100) / 100;
  const simNetPool = Math.max(0, Math.round((simBudget - simPlatformFee) * 100) / 100);
  const simPerWorker = simWorkers > 0 ? Math.round((simNetPool / simWorkers) * 100) / 100 : 0;

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
            <Briefcase className="w-7 h-7 text-indigo-400" />
            Micro-Gig Economy Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Governance module for temporary staffing, dynamic commission tiers, and accountant escrow ledgers.
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
          { id: 'users', label: `User Directory (${users.length})` },
          { id: 'jobs', label: `Job Monitor (${jobs.length})` },
          { id: 'delayed', label: `Delayed Approval Alerts (${delayedApprovals.length})` },
          { id: 'ledger', label: `Accountant Escrow Ledger (${ledger.length})` },
          { id: 'commission', label: `Platform Commission Controls` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === t.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t.id === 'commission' && <Sliders className="w-3.5 h-3.5 text-indigo-400" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: User Directory */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">User Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">{u.fullName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-indigo-300">
                        {u.role.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{u.email}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{u.mobile}</td>
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
                            onClick={() => setSelectedUser(u)}
                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold border border-rose-500/20 transition"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(u, 'ACTIVE')}
                            className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20 transition"
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

      {/* TAB 2: Job Monitor */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Gig Title</th>
                    <th className="py-3 px-4">Host</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Workers</th>
                    <th className="py-3 px-4">Pay Amount</th>
                    <th className="py-3 px-4">Waiting List</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">{j.title}</td>
                      <td className="py-3 px-4 text-slate-300">{j.hostName}</td>
                      <td className="py-3 px-4 text-indigo-300 font-mono text-[11px]">{j.category}</td>
                      <td className="py-3 px-4 font-mono">
                        {j.confirmedWorkers} / {j.requiredWorkers}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-mono font-bold">${j.paymentAmount}</td>
                      <td className="py-3 px-4 font-mono text-amber-400">
                        {j.waitlistCount > 0 ? `${j.waitlistCount} Waiting` : 'None'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                          {j.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Delayed Host Approval Monitoring (MODULE 8.3) */}
      {activeTab === 'delayed' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300">
            <strong>Module 8.3 Specification: </strong> Monitors completed gig shifts where workers have checked out, but hosts have not approved release within the required 24-hour window. Admins can dispatch automated warning reminders.
          </div>

          {delayedApprovals.length === 0 ? (
            <EmptyState
              title="No Delayed Host Approvals"
              description="All completed worker shifts have been reviewed and approved by their respective gig hosts within the 24-hour compliance window."
            />
          ) : (
            <div className="space-y-3">
              {delayedApprovals.map((d, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">{d.gigTitle}</div>
                    <div className="text-xs text-slate-400">
                      Host: <strong className="text-white">{d.hostName}</strong> ({d.hostEmail})
                    </div>
                    <div className="text-xs text-slate-400">
                      Worker: <strong className="text-indigo-300">{d.partnerName}</strong>
                    </div>
                    <div className="text-[11px] text-amber-400 font-mono pt-1">
                      Completed: {new Date(d.completionTime).toLocaleString()} • Delay: {d.hoursDelayed} hours past deadline
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendReminder(d.gigId, d.partnerId)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Dispatch Warning Reminder
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Accountant Escrow Ledger (MODULE 8.4) */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {ledger.length === 0 ? (
            <EmptyState
              title="Escrow Ledger Empty"
              description="Financial transactions, platform fee records, and release timestamps will appear here as gigs are executed."
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Tx ID</th>
                      <th className="py-3 px-4 font-sans">Gig Title</th>
                      <th className="py-3 px-4 font-sans">Host</th>
                      <th className="py-3 px-4 font-sans">Worker</th>
                      <th className="py-3 px-4">Gross</th>
                      <th className="py-3 px-4">Platform Fee</th>
                      <th className="py-3 px-4">Net Partner</th>
                      <th className="py-3 px-4">Escrow Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ledger.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-slate-300 font-bold">{l.transactionId}</td>
                        <td className="py-3 px-4 font-sans text-white">{l.title}</td>
                        <td className="py-3 px-4 font-sans text-slate-300">{l.payerName}</td>
                        <td className="py-3 px-4 font-sans text-slate-300">{l.payeeName}</td>
                        <td className="py-3 px-4 text-slate-300">${l.grossAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-indigo-400">${l.platformFee.toFixed(2)}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">${l.netPartnerAmount.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 font-bold">
                            {l.escrowStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Platform Commission & Brokerage Controls */}
      {activeTab === 'commission' && (
        <div className="space-y-6">
          {settingsSuccessMessage && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{settingsSuccessMessage}</span>
            </div>
          )}

          {settingsErrorMessage && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{settingsErrorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveCommissionSettings} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Engine 1: Micro-Gig Economy */}
              <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-400 mb-2">
                      <Briefcase className="w-3.5 h-3.5" />
                      Engine 1: Micro-Gig Economy
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Dynamic Brokerage Commission Tiers
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Fees are deducted directly from the Gig Host's posted budget. Partner job cards show only the net payout.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Tier 1 Threshold (Max Workers for Standard Tier)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={platformSettings.microGigTier1MaxMembers}
                        onChange={(e) =>
                          setPlatformSettings({
                            ...platformSettings,
                            microGigTier1MaxMembers: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition"
                      />
                      <span className="absolute right-4 top-2.5 text-xs text-slate-500 font-mono">Members</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Gigs requiring 1 to {platformSettings.microGigTier1MaxMembers} workers will be charged Tier 1 rate.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Tier 1 Fee Rate (1 to {platformSettings.microGigTier1MaxMembers} Members)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          max={50}
                          required
                          value={platformSettings.microGigTier1FeePercentage}
                          onChange={(e) =>
                            setPlatformSettings({
                              ...platformSettings,
                              microGigTier1FeePercentage: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition"
                        />
                        <span className="absolute right-4 top-2.5 text-xs text-slate-500 font-mono">%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Default: 10% deducted from budget</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Tier 2 Bulk Fee Rate (Above {platformSettings.microGigTier1MaxMembers} Members)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          max={50}
                          required
                          value={platformSettings.microGigTier2FeePercentage}
                          onChange={(e) =>
                            setPlatformSettings({
                              ...platformSettings,
                              microGigTier2FeePercentage: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition"
                        />
                        <span className="absolute right-4 top-2.5 text-xs text-slate-500 font-mono">%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Default: 5% volume discount</p>
                    </div>
                  </div>

                  {/* Privacy Protocol Badge */}
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span>Privacy & Visibility Enforcement Active</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Deducted platform fee is strictly hidden from Gig Partners. Gig Partner feed cards and detail modals display <strong className="text-white">only the net payout amount</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Engine 2: Local Services Marketplace */}
              <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400 mb-2">
                      <Percent className="w-3.5 h-3.5" />
                      Engine 2: Collective Local Services
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Platform Service Fee Structure
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Fixed platform service fee applied to Tech Partner listings. Internal between platform and technician.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Standard Platform Service Fee
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={50}
                        required
                        value={platformSettings.localServiceCommissionPercentage}
                        onChange={(e) =>
                          setPlatformSettings({
                            ...platformSettings,
                            localServiceCommissionPercentage: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition"
                      />
                      <span className="absolute right-4 top-2.5 text-xs text-slate-500 font-mono">%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Default: 10% platform fee deducted internally from Tech Partner earnings upon service completion.
                    </p>
                  </div>

                  {/* Privacy Protocol Badge */}
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>Seeker Pricing Cleanliness Active</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Service Seekers see only the clean standard service price (e.g. ₹500), with zero itemized platform commission or tax surcharge rows displayed during checkout.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1 text-xs">
                    <span className="font-semibold text-slate-300 block">Dual-Ledger Split:</span>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Tech Partner Payout:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {(100 - platformSettings.localServiceCommissionPercentage)}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Platform Retained Fee:</span>
                      <span className="font-mono text-cyan-400 font-bold">
                        {platformSettings.localServiceCommissionPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Interactive Policy Simulator */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    Live Commission & Payout Policy Simulator
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test how current settings affect Gig Host budget deductions and net worker earnings in real-time.
                  </p>
                </div>
                <div className="text-xs font-mono px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                  Active Tier: <strong className={simWorkers <= platformSettings.microGigTier1MaxMembers ? 'text-indigo-400' : 'text-emerald-400'}>
                    {simWorkers <= platformSettings.microGigTier1MaxMembers
                      ? `Tier 1 (Standard ${simTierRate}%)`
                      : `Tier 2 (Bulk Discount ${simTierRate}%)`}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Simulate Required Workers: {simWorkers} members
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={simWorkers}
                    onChange={(e) => setSimWorkers(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>1 Worker</span>
                    <span>Tier 1 Cutoff ({platformSettings.microGigTier1MaxMembers})</span>
                    <span>20 Workers</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Simulate Host Posted Budget: ₹{simBudget.toLocaleString()}
                  </label>
                  <input
                    type="range"
                    min={500}
                    max={50000}
                    step={500}
                    value={simBudget}
                    onChange={(e) => setSimBudget(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>₹500</span>
                    <span>₹25,000</span>
                    <span>₹50,000</span>
                  </div>
                </div>
              </div>

              {/* Simulation Result Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Host Escrow Deposit</span>
                  <div className="text-base font-bold text-white font-mono mt-1">₹{simBudget.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-500">100% posted budget</span>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-indigo-500/20">
                  <span className="text-[10px] uppercase font-mono text-indigo-400 block">Deducted Brokerage ({simTierRate}%)</span>
                  <div className="text-base font-bold text-indigo-300 font-mono mt-1">₹{simPlatformFee.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-500">Platform retained</span>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-mono text-emerald-400 block">Net Worker Pool</span>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-1">₹{simNetPool.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-500">Distributed to workers</span>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Partner Payout (Shown on Card)</span>
                  <div className="text-base font-bold text-white font-mono mt-1">₹{simPerWorker.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-500">Net per worker</span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={handleResetCommissionSettings}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Defaults (10% / 5% / 10%)
              </button>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSavingSettings ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deploying Policy...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Deploy Commission Policy</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Suspend User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 max-w-md w-full rounded-3xl p-6 shadow-2xl relative space-y-4">
            <h3 className="text-lg font-bold text-white">Suspend User: {selectedUser.fullName}</h3>
            <p className="text-xs text-slate-400">Account will be immediately restricted from logging in and transacting.</p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Reason for Suspension
              </label>
              <textarea
                rows={3}
                required
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="State violation details, attendance dispute, or verification issue..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedUser, 'SUSPENDED')}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
