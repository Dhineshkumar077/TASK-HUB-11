import React, { useState, useEffect } from 'react';
import {
  Shield,
  Briefcase,
  Wrench,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Lock,
  Layers,
  ArrowRight,
  Bell,
  CheckCircle,
  Sliders,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useRealtime } from '../../context/RealtimeContext.tsx';

interface AdminDashboardProps {
  navigate: (path: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigate }) => {
  const { lastEvent } = useRealtime();
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMetrics = async () => {
    try {
      const res = await api.getAdminOverview();
      setMetrics(res);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [lastEvent?.timestamp]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400 animate-pulse text-sm">
        Loading system-wide ledger and account registries...
      </div>
    );
  }

  const counts = metrics?.counts || {};
  const finances = metrics?.finances || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-400 mb-2">
            <Shield className="w-3.5 h-3.5" />
            Master Administrative Control Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            System Operational Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time platform ledger, account governance, escrow balances, and dual-division monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/admin/micro-gig-monitor')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Commission Controls
          </button>
          <button
            onClick={() => navigate('/admin/command-center')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            Command Center
          </button>
        </div>
      </div>

      {/* Financial Ledger Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Total Platform Revenue
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            ${finances.totalPlatformRevenue?.toFixed(2) || '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">Earned marketplace commissions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Gross Transaction Volume
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            ${finances.grossTransactionVolume?.toFixed(2) || '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">Processed across both divisions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Settlement Escrow Balances
          </span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
            ${finances.escrowLockedBalances?.toFixed(2) || '0.00'}
          </div>
          <div className="text-[11px] text-slate-500">Currently held in escrow rails</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
            Open Disputes
          </span>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
            {counts.openDisputes || 0}
          </div>
          <div className="text-[11px] text-slate-500">Awaiting admin resolution</div>
        </div>
      </div>

      {/* Account Counts Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-xs font-semibold text-slate-400">Gig Hosts</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{counts.gigHostsCount || 0}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-xs font-semibold text-slate-400">Gig Partners</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{counts.gigPartnersCount || 0}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-xs font-semibold text-slate-400">Service Seekers</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{counts.serviceSeekersCount || 0}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="text-xs font-semibold text-slate-400">Tech Partners</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{counts.techPartnersCount || 0}</div>
        </div>
      </div>

      {/* Dual Business Sub-Portals Launchers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 8 Monitor Card */}
        <div className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl transition group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold uppercase">
                Module 8 Sub-Portal
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition">
                Micro-Gig Economy Monitor
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Supervise all gig shifts, review user accounts, monitor delayed host approvals (&gt;24h), dispatch warning reminders, and inspect the accountant escrow ledger.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div>Total Gigs: <strong className="text-white font-mono">{counts.totalGigs || 0}</strong></div>
              <div>Micro-Gig Rev: <strong className="text-emerald-400 font-mono">${finances.microGigRevenue?.toFixed(2) || '0.00'}</strong></div>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/micro-gig-monitor')}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            Open Micro-Gig Monitor
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module 9 Monitor Card */}
        <div className="bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl transition group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Wrench className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold uppercase">
                Module 9 Sub-Portal
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition">
                Local Service Marketplace Monitor
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Manage service listings, toggle violations, monitor booking attendance, view local financial ledgers, and audit category revenue breakdowns.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div>Total Bookings: <strong className="text-white font-mono">{counts.totalBookings || 0}</strong></div>
              <div>Local Service Rev: <strong className="text-emerald-400 font-mono">${finances.localServiceRevenue?.toFixed(2) || '0.00'}</strong></div>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/local-service-monitor')}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30"
          >
            Open Local Service Monitor
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
