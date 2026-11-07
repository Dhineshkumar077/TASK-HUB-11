import React, { useState, useEffect } from 'react';
import {
  Search,
  Wrench,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Star,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  QrCode,
  ArrowRight,
  Navigation,
  Compass,
  Layers,
  ArrowLeft,
  X,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { ServiceListing, ServiceBooking } from '../../types.ts';
import { EmptyState } from '../../components/EmptyState.tsx';
import { BookServiceModal } from '../../components/BookServiceModal.tsx';
import { getCurrentDeviceLocation } from '../../utils/geolocation.ts';

interface SearchTechPartnersProps {
  navigate: (path: string) => void;
}

const CATEGORIES = [
  'All',
  'Plumber',
  'Electrician',
  'AC Technician',
  'Bike Mechanic',
  'Carpenter',
  'Painter',
  'Appliance Repair',
  'Washing Machine Repair',
  'Refrigerator Repair',
  'Computer and Laptop Repair',
  'Cleaning Services',
  'Home Maintenance',
  'Installation Services',
  'General Technician',
  'Others',
];

export const SearchTechPartners: React.FC<SearchTechPartnersProps> = ({ navigate }) => {
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState<number>(10); // 10 to 15 km strict operational range
  const [minRating, setMinRating] = useState<number>(0);
  const [userLat, setUserLat] = useState(13.0827);
  const [userLng, setUserLng] = useState(80.2707);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Modal
  const [bookingService, setBookingService] = useState<ServiceListing | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        userLat,
        userLng,
        radiusKm,
      };
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getServices(params);
      let list = res.services || [];
      if (minRating > 0) {
        list = list.filter((s: ServiceListing) => (s.techPartnerRating || 0) >= minRating);
      }
      setServices(list);
    } catch (err) {
      console.error('Failed to search services:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServices();
    }, 200);
    return () => clearTimeout(timer);
  }, [userLat, userLng, selectedCategory, radiusKm, minRating, searchQuery]);

  const [isLocating, setIsLocating] = useState(false);

  const handleAcquireGps = async () => {
    setIsLocating(true);
    try {
      const loc = await getCurrentDeviceLocation();
      setUserLat(loc.latitude);
      setUserLng(loc.longitude);
    } catch (err: any) {
      console.warn('Geolocation warning:', err.message);
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/seeker/dashboard')}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Find Nearby Tech Partners (10 - 15 km Radius)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Certified plumbers, electricians, AC technicians, carpenters, and appliance experts operating within 10 to 15 km.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAcquireGps}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            Acquire GPS
          </button>
          {/* Isolated Map View Navigation Button */}
          <button
            onClick={() => navigate('/seeker/map')}
            className="px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            Open Dedicated Map (10-15 km)
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => navigate('/seeker/bookings')}
            className="underline font-bold text-emerald-300 hover:text-white"
          >
            View in My Bookings
          </button>
        </div>
      )}

      {/* Filter and Search Bar with 10-15 km Radius */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trade keywords (e.g. pipe leak, wiring, AC)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
            >
              {CATEGORIES.map((cat, idx) => (
                <option key={cat} value={cat}>
                  {idx === 0 ? 'All 16 Verified Categories' : `${idx}. ${cat}`}
                </option>
              ))}
            </select>
          </div>

          {/* Operational Radius Controls (10 km to 15 km) */}
          <div className="sm:col-span-3 flex items-center justify-between bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 pl-2">Radar:</span>
            <div className="flex items-center gap-1">
              {[10, 12, 15].map((km) => (
                <button
                  key={km}
                  onClick={() => setRadiusKm(km)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    radiusKm === km
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Category Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-500 text-[11px]">Filter by Trade:</span>
          {['Plumber', 'Electrician', 'AC Technician', 'Appliance Repair', 'Carpenter', 'Others'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? 'All' : cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
          {selectedCategory !== 'All' && (
            <button
              onClick={() => setSelectedCategory('All')}
              className="text-xs text-cyan-400 hover:text-white underline ml-auto"
            >
              Clear Category Filter
            </button>
          )}
        </div>
      </div>

      {/* Services Grid (Section 2: Title and Category Badging Synchronized) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-cyan-400" />
            Verified Tech Partner Listings ({services.length})
          </h2>
          <span className="text-xs font-mono text-cyan-400">
            Within {radiusKm} km Radius
          </span>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-slate-400 animate-pulse text-sm bg-slate-900 border border-slate-800 rounded-3xl">
            Scanning {radiusKm} km radius for certified tech partners...
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            title={`No Services Found within ${radiusKm} km`}
            description={`There are currently no active listings within ${radiusKm} km of your radar location. Try expanding the radius to 15 km or clearing filters.`}
            actionText="Expand Radius to 15 km"
            onAction={() => setRadiusKm(15)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition shadow-lg"
              >
                <div className="space-y-3">
                  {/* Category Badge & Distance */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold uppercase tracking-wider">
                      {svc.category === 'Others' ? (svc.customCategory || 'Others') : svc.category}
                    </span>
                    {svc.distanceKm !== undefined && (
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {svc.distanceKm} km away
                      </span>
                    )}
                  </div>

                  {/* Title & Tech Partner Info */}
                  <div>
                    <h3 className="text-base font-bold text-white">{svc.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                      <strong className="text-white">{svc.techPartnerName}</strong>
                      <span className="text-amber-400 flex items-center text-[11px] font-semibold">
                        ★ {svc.techPartnerRating && svc.techPartnerRating > 0 ? svc.techPartnerRating.toFixed(1) : 'New'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{svc.description}</p>
                  </div>

                  {/* Pricing Breakdown (Hybrid Shift Rates) */}
                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Half-Day Shift (4 hrs):</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ₹{svc.halfDayPrice || svc.price}
                      </span>
                    </div>
                    {svc.fullDayPrice && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Full-Day Shift (8 hrs):</span>
                        <span className="font-mono text-white font-semibold">₹{svc.fullDayPrice}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Operational Radar:</span>
                      <span className="font-mono text-cyan-300 font-semibold">
                        {svc.operatingRadiusKm || 10} km Strict
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate pt-0.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                      <span className="truncate">{svc.serviceAreaCoverage || svc.serviceArea}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setBookingService(svc)}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-900/30 cursor-pointer"
                  >
                    <span>Book Shift Appointment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Service Modal with Step 1 Base Escrow Lock, Shift Selection, Inline Map Pinning, and Privacy Filter */}
      {bookingService && (
        <BookServiceModal
          isOpen={!!bookingService}
          onClose={() => setBookingService(null)}
          service={bookingService}
          onSuccess={(b) => {
            setSuccessMessage(`Shift appointment booked! $${b.totalPayableAmount} deposited into Escrow.`);
            setBookingService(null);
            fetchServices();
          }}
        />
      )}
    </div>
  );
};
