import React, { useState } from 'react';
import {
  Layers,
  Briefcase,
  Wrench,
  Shield,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Wallet,
  Calendar,
  PlusCircle,
  MapPin,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../types.ts';
import { NotificationBar } from './NotificationBar.tsx';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const getDashboardRoute = (role: UserRole): string => {
    switch (role) {
      case 'GIG_HOST':
        return '/host/dashboard';
      case 'GIG_PARTNER':
        return '/partner/dashboard';
      case 'SERVICE_SEEKER':
        return '/seeker/dashboard';
      case 'TECH_PARTNER':
        return '/tech/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  const getRoleBadgeColor = (role: UserRole): string => {
    switch (role) {
      case 'GIG_HOST':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'GIG_PARTNER':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'SERVICE_SEEKER':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'TECH_PARTNER':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ADMIN':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 group text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-600/30">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center group-hover:bg-transparent transition duration-300">
                  <Layers className="w-5 h-5 text-indigo-400 group-hover:text-white transition" />
                </div>
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  TASKHUB
                </span>
                <span className="block text-[9px] font-mono text-indigo-400 tracking-wider uppercase font-semibold">
                  Dual Economy Ecosystem
                </span>
              </div>
            </button>

            {/* Division Switcher Links (Desktop) */}
            <div className="hidden md:flex items-center gap-1 text-xs font-semibold">
              <button
                onClick={() => navigate('/#micro-gig')}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  currentPath.includes('host') || currentPath.includes('partner')
                    ? 'text-indigo-400 bg-indigo-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Micro-Gig Economy
              </button>
              <button
                onClick={() => navigate('/#local-services')}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  currentPath.includes('seeker') || currentPath.includes('tech')
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Collective Local Services
              </button>
            </div>
          </div>

          {/* User Profile / Portal Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Specific Role Shortcuts (Zero Redundant Dashboard Buttons) */}
                {user.role === 'GIG_HOST' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/host/dashboard')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/host/dashboard' || currentPath.startsWith('/host/gigs')
                          ? 'bg-indigo-600 text-white shadow'
                          : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                      Home
                    </button>
                    <button
                      onClick={() => navigate('/host/post-gig')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/host/post-gig'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Post New Gig
                    </button>
                    <button
                      onClick={() => navigate('/host/approvals')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/host/approvals'
                          ? 'bg-amber-600 text-white shadow'
                          : 'border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Approvals
                    </button>
                  </div>
                )}

                {user.role === 'TECH_PARTNER' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/tech/dashboard')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/tech/dashboard'
                          ? 'bg-amber-600 text-white shadow'
                          : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      Home
                    </button>
                    <button
                      onClick={() => navigate('/tech/create-service')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/tech/create-service'
                          ? 'bg-amber-600 text-white shadow'
                          : 'border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Create Service
                    </button>
                    <button
                      onClick={() => navigate('/tech/bookings')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/tech/bookings'
                          ? 'bg-amber-600 text-white shadow'
                          : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Bookings
                    </button>
                    <button
                      onClick={() => navigate('/tech/wallet')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/tech/wallet'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      Dual Wallet
                    </button>
                  </div>
                )}

                {user.role === 'SERVICE_SEEKER' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/seeker/dashboard')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/seeker/dashboard'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                      Home
                    </button>
                    <button
                      onClick={() => navigate('/seeker/search')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/seeker/search'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      Find Techs
                    </button>
                    <button
                      onClick={() => navigate('/seeker/map')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/seeker/map'
                          ? 'bg-cyan-600 text-white shadow ring-2 ring-cyan-500/30'
                          : 'border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
                      }`}
                      title="Dedicated 10-15 km Radar Map"
                    >
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      Map
                    </button>
                    <button
                      onClick={() => navigate('/seeker/bookings')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/seeker/bookings'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      My Bookings
                    </button>
                  </div>
                )}

                {user.role === 'GIG_PARTNER' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/partner/dashboard')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/partner/dashboard'
                          ? 'bg-blue-600 text-white shadow'
                          : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                      Home
                    </button>
                    <button
                      onClick={() => navigate('/partner/browse')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/partner/browse'
                          ? 'bg-blue-600 text-white shadow'
                          : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      Browse Gigs
                    </button>
                    <button
                      onClick={() => navigate('/partner/map')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/partner/map'
                          ? 'bg-blue-600 text-white shadow ring-2 ring-blue-500/30'
                          : 'border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300'
                      }`}
                      title="Interactive Real-Time Gig Map"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      Map (10 km)
                    </button>
                    <button
                      onClick={() => navigate('/partner/earnings')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        currentPath === '/partner/earnings'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      Earnings
                    </button>
                  </div>
                )}

                {user.role === 'ADMIN' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/admin/micro-gig-monitor')}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
                    >
                      Micro-Gigs
                    </button>
                    <button
                      onClick={() => navigate('/admin/local-service-monitor')}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
                    >
                      Services
                    </button>
                    <button
                      onClick={() => navigate('/admin/command-center')}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
                    >
                      Command Center
                    </button>
                  </div>
                )}

                {/* Dynamic Notification Bar (Zero Default State) */}
                <NotificationBar navigate={navigate} />

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                      {user.fullName.charAt(0)}
                    </div>
                    <div className="text-left hidden lg:block pr-1">
                      <div className="text-xs font-bold text-white leading-tight">
                        {user.fullName}
                      </div>
                      <div className={`text-[10px] font-mono px-1 rounded border inline-block ${getRoleBadgeColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 text-xs animate-fade-in">
                      <div className="p-2 border-b border-slate-800">
                        <div className="font-bold text-white">{user.fullName}</div>
                        <div className="text-slate-400 text-[11px] font-mono">{user.email}</div>
                        <div className="text-slate-400 text-[11px] font-mono">{user.mobile}</div>
                      </div>

                      <div className="py-1">
                        {/* Comprehensive My Profile section across all portals */}
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            navigate('/profile');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 font-semibold transition ${
                            currentPath === '/profile'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-200 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <User className="w-4 h-4 text-indigo-400" />
                          My Profile & Ledgers
                        </button>

                        {user.role === 'GIG_PARTNER' && (
                          <>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                navigate('/partner/browse');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Briefcase className="w-4 h-4 text-blue-400" />
                              Browse Gigs
                            </button>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                navigate('/partner/map');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                            >
                              <MapPin className="w-4 h-4 text-blue-400" />
                              Live Gig Map
                            </button>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                navigate('/partner/earnings');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Wallet className="w-4 h-4 text-emerald-400" />
                              My Earnings Ledger
                            </button>
                          </>
                        )}

                        {user.role === 'GIG_HOST' && (
                          <>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                navigate('/host/post-gig');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                            >
                              <PlusCircle className="w-4 h-4 text-indigo-400" />
                              Post New Gig
                            </button>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                navigate('/host/dashboard');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Briefcase className="w-4 h-4 text-indigo-400" />
                              Manage Posted Gigs
                            </button>
                          </>
                        )}

                        {user.role === 'TECH_PARTNER' && (
                          <>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                navigate('/tech/create-service');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                            >
                              <PlusCircle className="w-4 h-4 text-amber-400" />
                              Create Service
                            </button>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                navigate('/tech/bookings');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Calendar className="w-4 h-4 text-amber-400" />
                              Manage Bookings
                            </button>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                navigate('/tech/wallet');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Wallet className="w-4 h-4 text-emerald-400" />
                              Dual Wallet Accounting
                            </button>
                          </>
                        )}

                        {user.role === 'SERVICE_SEEKER' && (
                          <>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                navigate('/seeker/search');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Wrench className="w-4 h-4 text-cyan-400" />
                              Find Tech Partners
                            </button>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                navigate('/seeker/bookings');
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Calendar className="w-4 h-4 text-cyan-400" />
                              My Service Bookings
                            </button>
                          </>
                        )}

                        {user.role === 'ADMIN' && (
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              navigate('/admin/dashboard');
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Shield className="w-4 h-4 text-rose-400" />
                            Admin Overview
                          </button>
                        )}
                      </div>

                      <div className="pt-1 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            logout();
                            navigate('/');
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/#divisions')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Select Portal
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 p-4 space-y-3 text-sm">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/#micro-gig');
            }}
            className="w-full text-left py-2 px-3 rounded-lg text-slate-200 hover:bg-slate-900 flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4 text-indigo-400" />
            Micro-Gig Economy Platform
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/#local-services');
            }}
            className="w-full text-left py-2 px-3 rounded-lg text-slate-200 hover:bg-slate-900 flex items-center gap-2"
          >
            <Wrench className="w-4 h-4 text-cyan-400" />
            Collective Local Service Marketplace
          </button>

          {user ? (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-xs text-slate-400 font-mono">Signed in as {user.fullName} ({user.role})</div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/profile');
                }}
                className="w-full text-left py-2 px-3 rounded-lg bg-slate-900 border border-indigo-500/30 text-indigo-300 font-semibold flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                My Profile & Ledgers
              </button>

              {user.role === 'GIG_PARTNER' && (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/partner/dashboard');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-2"
                  >
                    <Briefcase className="w-4 h-4" />
                    Home (Dashboard)
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/partner/browse');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-semibold flex items-center gap-2"
                  >
                    <Search className="w-4 h-4 text-blue-400" />
                    Browse Gigs
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/partner/map');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-slate-900 border border-blue-500/30 text-blue-300 font-semibold flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Radar Map (10 km)
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/partner/earnings');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 font-semibold flex items-center gap-2"
                  >
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    My Earnings Ledger
                  </button>
                </>
              )}

              {user.role === 'GIG_HOST' && (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/host/dashboard');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-indigo-600 text-white font-semibold flex items-center gap-2"
                  >
                    <Briefcase className="w-4 h-4" />
                    Home (Dashboard)
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/host/post-gig');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-slate-900 border border-indigo-500/30 text-indigo-300 font-semibold flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Post New Gig
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/host/approvals');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Completion Approvals
                  </button>
                </>
              )}

              {user.role === 'TECH_PARTNER' && (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/tech/create-service');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-amber-600 text-white font-semibold flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create Service
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/tech/bookings');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-semibold flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-amber-400" />
                    Bookings
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/tech/wallet');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 font-semibold flex items-center gap-2"
                  >
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    Dual Wallet
                  </button>
                </>
              )}

              {user.role === 'SERVICE_SEEKER' && (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/seeker/search');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-cyan-600 text-white font-semibold flex items-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    Find Tech Partners
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/seeker/map');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    Radar Map View (10-15 km)
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/seeker/bookings');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-semibold flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    My Bookings
                  </button>
                </>
              )}

              {user.role === 'ADMIN' && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/admin/dashboard');
                  }}
                  className="w-full text-left py-2 px-3 rounded-lg bg-rose-600 text-white font-semibold flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Admin Overview
                </button>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  navigate('/');
                }}
                className="w-full text-left py-2 px-3 rounded-lg text-rose-400 hover:bg-rose-500/10"
              >
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      )}
    </nav>
  );
};
