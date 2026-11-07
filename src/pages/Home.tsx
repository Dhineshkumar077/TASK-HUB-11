import React, { useState } from 'react';
import {
  Briefcase,
  Wrench,
  Users,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  MapPin,
  Lock,
  Clock,
  Sparkles,
  CheckCircle2,
  Sliders,
  DollarSign,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface HomeProps {
  navigate: (path: string) => void;
}

export const Home: React.FC<HomeProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [selectedDivision, setSelectedDivision] = useState<'micro-gig' | 'local-services' | null>(null);

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 to-cyan-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-xs font-semibold text-indigo-300 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Unified Dual-Engine Platform for Gigs & Local Services</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-none">
            Empowering On-Demand Work & <br />
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-300 bg-clip-text text-transparent">
              Trusted Local Services
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            TaskHub seamlessly unifies flexible shift opportunities with verified on-demand local technician services. Protected by cryptographic authentication, 10 to 15 km geospatial filtering, geofenced attendance, and Escrow-locked settlements.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#divisions"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-xl shadow-indigo-600/30 flex items-center gap-2"
            >
              Explore Business Divisions
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* MODULE 1: EXACTLY TWO PRIMARY BUSINESS DIVISION CARDS */}
      <section id="divisions" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Select a Business Division
          </h2>
          <p className="text-sm text-slate-400">
            TaskHub is structured into two autonomous business engines. Choose a division below to access its dedicated registration and login portals.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ============================================================ */}
          {/* DIVISION CARD 1: Micro-Gig Economy Platform */}
          {/* ============================================================ */}
          <div
            id="micro-gig"
            className={`rounded-3xl p-8 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
              selectedDivision === 'micro-gig'
                ? 'bg-slate-900/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-2xl shadow-indigo-950'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Briefcase className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  Division 01
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Micro-Gig Economy Platform
                </h3>
                <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">
                  A platform where people and businesses can publish short-duration jobs, temporary shifts, flexible work, event staffing opportunities, and contract-based employment opportunities.
                </p>
              </div>

              {/* Core Features list */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>10 to 15 km Radius Discovery</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Geofenced Attendance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Railway Waiting List</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>FlexiStaff Contracts (5-10% Fee)</span>
                </div>
              </div>

              {/* Portals inside Division 1 */}
              <div className="pt-6 border-t border-slate-800 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select User Portal:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gig Host Portal */}
                  <div className="bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between transition group">
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                        Gig Host
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                        For businesses, employers, shops, supermarkets, event organizers, and temporary employers.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => navigate('/host/register')}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition text-center"
                      >
                        Register
                      </button>
                      <button
                        onClick={() => navigate('/host/login')}
                        className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition text-center"
                      >
                        Login
                      </button>
                    </div>
                  </div>

                  {/* Gig Partner Portal */}
                  <div className="bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between transition group">
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                        Gig Partner
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                        For individuals who want to discover and apply for temporary jobs, flexible shifts, and contracts.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => navigate('/partner/register')}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition text-center"
                      >
                        Register
                      </button>
                      <button
                        onClick={() => navigate('/partner/login')}
                        className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition text-center"
                      >
                        Login
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* DIVISION CARD 2: Collective Local Service Marketplace */}
          {/* ============================================================ */}
          <div
            id="local-services"
            className={`rounded-3xl p-8 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
              selectedDivision === 'local-services'
                ? 'bg-slate-900/90 border-cyan-500 ring-2 ring-cyan-500/20 shadow-2xl shadow-cyan-950'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                  <Wrench className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                  Division 02
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Collective Local Service Marketplace
                </h3>
                <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">
                  A platform where customers can discover and book nearby professionals for repair, maintenance, installation, and other local services.
                </p>
              </div>

              {/* Core Features list */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>15 Certified Categories + Others</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>UPI, Cards & Net Banking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Escrow-Protected Settlement</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Tech Partner Dual Wallet</span>
                </div>
              </div>

              {/* Portals inside Division 2 */}
              <div className="pt-6 border-t border-slate-800 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select User Portal:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Service Seeker Portal */}
                  <div className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-4 flex flex-col justify-between transition group">
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                        Service Seeker
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                        For customers who need local professional services with upfront pricing and escrow protection.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => navigate('/seeker/register')}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition text-center"
                      >
                        Register
                      </button>
                      <button
                        onClick={() => navigate('/seeker/login')}
                        className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition text-center"
                      >
                        Login
                      </button>
                    </div>
                  </div>

                  {/* Tech Partner Portal */}
                  <div className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-4 flex flex-col justify-between transition group">
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                        Tech Partner
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                        For technicians and service professionals who want to publish services, receive bookings, and earn money.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => navigate('/tech/register')}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition text-center"
                      >
                        Register
                      </button>
                      <button
                        onClick={() => navigate('/tech/login')}
                        className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition text-center"
                      >
                        Login
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Architecture Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900/50 border border-slate-800 p-8 sm:p-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center sm:text-left">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto sm:mx-0">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">20 km Geospatial Discovery</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Backend Haversine mathematical filtering ensures all gig seekers and service seekers find hyper-local partners within 20 kilometers.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto sm:mx-0">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Escrow-Locked Settlements</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Payments are held securely in Escrow until physical check-out and customer or host work approval. Zero premature releases.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto sm:mx-0">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Geofenced Attendance</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Workers and technicians verify on-site presence through GPS check-in (within 200 meters) and check-out tracking.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto sm:mx-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Instant Account Setup</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct, streamlined registration enables immediate access across all 4 dedicated portals without waiting for verification codes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Administrative Control Portal Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-rose-500/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">
                Master Admin Control Panel
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Restricted operations sub-portal for platform governance: Micro-Gig Monitor, Delayed Host Approval reminders, Local Service Ledger, and Central Command Center.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/login')}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-rose-600/30 shrink-0 flex items-center gap-2"
          >
            Access Admin Panel
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
