import React from 'react';
import { Layers, ShieldCheck, MapPin, Lock, FileText, HelpCircle, Shield } from 'lucide-react';

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 text-xs mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">TASKHUB</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Unified enterprise platform combining the Micro-Gig Economy and Collective Local Service Marketplace with cryptographic OTP authentication, 20 km geospatial filtering, geofenced attendance, and Escrow-locked settlements.
            </p>
            <div className="flex items-center gap-3 text-slate-500">
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-emerald-400" /> Escrow Protected</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-400" /> 20 km Verified</span>
            </div>
          </div>

          {/* Division 1: Micro-Gig Economy */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3 text-indigo-400">
              Micro-Gig Economy Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => navigate('/host/register')} className="hover:text-white transition">
                  Gig Host Registration
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/host/login')} className="hover:text-white transition">
                  Gig Host Login
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/partner/register')} className="hover:text-white transition">
                  Gig Partner Registration
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/partner/login')} className="hover:text-white transition">
                  Gig Partner Login
                </button>
              </li>
              <li>
                <span className="text-[11px] text-slate-500">FlexiStaff 1–3 Mo Contracts (5–10% Fee)</span>
              </li>
              <li>
                <span className="text-[11px] text-slate-500">Railway-Style Waiting List Queue</span>
              </li>
            </ul>
          </div>

          {/* Division 2: Collective Local Services */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3 text-cyan-400">
              Collective Local Service Marketplace
            </h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => navigate('/seeker/register')} className="hover:text-white transition">
                  Service Seeker Registration
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/seeker/login')} className="hover:text-white transition">
                  Service Seeker Login
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/tech/register')} className="hover:text-white transition">
                  Tech Partner Registration
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/tech/login')} className="hover:text-white transition">
                  Tech Partner Login
                </button>
              </li>
              <li>
                <span className="text-[11px] text-slate-500">15 Standard Categories + Others</span>
              </li>
              <li>
                <span className="text-[11px] text-slate-500">Tech Partner Dual Wallet Accounting</span>
              </li>
            </ul>
          </div>

          {/* Administration & Governance */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3 text-rose-400">
              Administrative Governance
            </h4>
            <ul className="space-y-2">
              <li>
                <span className="text-[11px] text-slate-400 font-medium">
                  Enterprise Governance Framework
                </span>
              </li>
              <li>
                <span className="text-[11px] text-slate-500">Micro-Gig Economy Monitor</span>
              </li>
              <li>
                <span className="text-[11px] text-slate-500">Delayed Host Approval Monitoring</span>
              </li>
              <li>
                <span className="text-[11px] text-slate-500">Accountant Escrow Ledgers</span>
              </li>
              <li>
                <span className="text-[11px] text-slate-500">Admin Command Center Broadcasts</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} TaskHub Platform Technologies Inc. All rights reserved. Zero Dummy Data Policy.
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="hover:text-slate-300 transition cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-300 transition cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-300 transition cursor-pointer">Escrow Settlement Guidelines</span>
            <span className="hover:text-slate-300 transition cursor-pointer">Geofence Compliance</span>
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="hover:text-slate-300 transition cursor-pointer flex items-center gap-1 text-slate-500 font-mono text-[10px]"
              title="Authorized Personnel Only"
            >
              <Lock className="w-2.5 h-2.5 text-slate-500" />
              <span>System Control</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
