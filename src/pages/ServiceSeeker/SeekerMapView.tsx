import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Wrench,
  Navigation,
  Compass,
  Star,
  DollarSign,
  ArrowRight,
  Layers,
  ArrowLeft,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { ServiceListing, ServiceBooking } from '../../types.ts';
import { InteractiveMap } from '../../components/InteractiveMap.tsx';
import { BookServiceModal } from '../../components/BookServiceModal.tsx';
import { getCurrentDeviceLocation } from '../../utils/geolocation.ts';

interface SeekerMapViewProps {
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

export const SeekerMapView: React.FC<SeekerMapViewProps> = ({ navigate }) => {
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState<number>(10); // 10 to 15 km strict operational range
  const [userLat, setUserLat] = useState(13.0827);
  const [userLng, setUserLng] = useState(80.2707);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceListing | null>(null);
  const [bookingService, setBookingService] = useState<ServiceListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  const fetchNearbyServices = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        userLat,
        userLng,
        radiusKm,
      };
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;

      const res = await api.getServices(params);
      setServices(res.services || []);
    } catch (err) {
      console.error('Failed to load services on map:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyServices();
  }, [userLat, userLng, radiusKm, selectedCategory]);

  const [isLocating, setIsLocating] = useState(false);

  const handleAcquireGps = async () => {
    setIsLocating(true);
    try {
      const loc = await getCurrentDeviceLocation();
      setUserLat(loc.latitude);
      setUserLng(loc.longitude);
    } catch (err: any) {
      console.warn('Geolocation error:', err.message);
    } finally {
      setIsLocating(false);
    }
  };

  const mapMarkers = services.map((svc) => ({
    id: svc.id,
    title: `${svc.title} (${svc.techPartnerName})`,
    lat: svc.latitude,
    lng: svc.longitude,
    category: svc.category === 'Others' ? (svc.customCategory || 'Others') : svc.category,
    price: svc.price,
    distanceKm: svc.distanceKm,
    hostName: svc.techPartnerName,
  }));

  const handleMarkerClick = (marker: any) => {
    setActiveMarkerId(marker.id);
    const svc = services.find((s) => s.id === marker.id);
    if (svc) {
      setSelectedService(svc);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/seeker/dashboard')}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Dedicated Radar Map View (10 - 15 km)
              </h1>
              <p className="text-xs text-slate-400">
                Explore nearby verified Tech Partners spatially within your strict 10 to 15 km operational zone.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAcquireGps}
            className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            My GPS Coordinates
          </button>
          <button
            onClick={() => navigate('/seeker/bookings')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            My Bookings
          </button>
        </div>
      </div>

      {bookingSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{bookingSuccessMsg}</span>
          </div>
          <button
            onClick={() => navigate('/seeker/bookings')}
            className="underline font-bold text-emerald-300 hover:text-white"
          >
            Go to Bookings
          </button>
        </div>
      )}

      {/* Control Bar: Keywords, Category, Radius (10-15 km) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Keyword Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchNearbyServices()}
              placeholder="Search trade keywords (e.g. pipe leak, AC service, wiring)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Category Dropdown */}
          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Verified Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Operational Radius (10 km to 15 km) */}
          <div className="sm:col-span-3 flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1.5 justify-center">
            <span className="text-[11px] font-semibold text-slate-400 px-1">Radar:</span>
            {[10, 12, 15].map((km) => (
              <button
                key={km}
                onClick={() => setRadiusKm(km)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
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

      {/* Split Layout: Isolated Map Canvas + Selected Partner Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <InteractiveMap
            selectedLat={userLat}
            selectedLng={userLng}
            radiusKm={radiusKm}
            height="560px"
            onLocationSelect={(lat, lng) => {
              setUserLat(lat);
              setUserLng(lng);
            }}
            markers={mapMarkers}
            activeMarkerId={activeMarkerId}
            onMarkerClick={handleMarkerClick}
            actionButtonText="Book Technician"
            onMarkerAction={(marker) => {
              const svc = services.find((s) => s.id === marker.id);
              if (svc) setBookingService(svc);
            }}
          />
        </div>

        {/* Selected Partner / Side Discovery Drawer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-cyan-400" />
                {selectedService ? 'Selected Tech Partner' : `Nearby Services (${services.length})`}
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded">
                Within {radiusKm} km
              </span>
            </div>

            {selectedService ? (
              <div className="mt-4 space-y-4 animate-fade-in">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase">
                      {selectedService.category === 'Others' ? selectedService.customCategory : selectedService.category}
                    </span>
                    {selectedService.distanceKm !== undefined && (
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {selectedService.distanceKm} km away
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-white mt-2">{selectedService.title}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                    <strong className="text-white">{selectedService.techPartnerName}</strong>
                    <span className="text-amber-400 text-xs">
                      ★ {selectedService.techPartnerRating && selectedService.techPartnerRating > 0 ? selectedService.techPartnerRating.toFixed(1) : 'New'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {selectedService.description}
                  </p>
                </div>

                {/* Shift Pricing Breakdown */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Half-Day Shift (4 hrs):</span>
                    <strong className="text-white font-mono">
                      ₹{selectedService.halfDayPrice || selectedService.price}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Full-Day Shift (8 hrs):</span>
                    <strong className="text-white font-mono">
                      ₹{selectedService.fullDayPrice || (selectedService.halfDayPrice ? selectedService.halfDayPrice * 1.8 : selectedService.price * 1.8)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Hourly Basis:</span>
                    <strong className="text-white font-mono">₹{selectedService.price}/hr</strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setBookingService(selectedService)}
                    className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Book Shift Appointment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedService(null)}
                    className="w-full py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="p-8 text-center text-slate-500 text-xs animate-pulse">
                    Scanning {radiusKm} km radius...
                  </div>
                ) : services.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No technicians found in {radiusKm} km with current filters. Try expanding radius to 15 km.
                  </div>
                ) : (
                  services.map((svc) => (
                    <div
                      key={svc.id}
                      onClick={() => {
                        setSelectedService(svc);
                        setActiveMarkerId(svc.id);
                        setUserLat(svc.latitude);
                        setUserLng(svc.longitude);
                      }}
                      className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase">
                          {svc.category === 'Others' ? svc.customCategory : svc.category}
                        </span>
                        {svc.distanceKm !== undefined && (
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            {svc.distanceKm} km
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-white truncate">{svc.title}</h5>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{svc.techPartnerName}</span>
                        <span className="font-mono text-white font-bold">₹{svc.halfDayPrice || svc.price}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Book Service Modal */}
      {bookingService && (
        <BookServiceModal
          isOpen={!!bookingService}
          onClose={() => setBookingService(null)}
          service={bookingService}
          onSuccess={(b) => {
            setBookingSuccessMsg(`Shift appointment booked! $${b.totalPayableAmount} securely deposited into Escrow.`);
            setBookingService(null);
            fetchNearbyServices();
          }}
        />
      )}
    </div>
  );
};
