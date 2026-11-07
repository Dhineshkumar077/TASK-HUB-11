import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Navigation,
  MapPin,
  Clock,
  Car,
  Compass,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { api } from '../services/api.ts';

interface RouteDirectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: {
    id?: string;
    title: string;
    fullAddress: string;
    workLocation?: string;
    lat: number;
    lng: number;
    hostName?: string;
    category?: string;
    paymentAmount?: number;
    paymentBasis?: string;
  };
  initialOriginLat?: number;
  initialOriginLng?: number;
}

export const RouteDirectionsModal: React.FC<RouteDirectionsModalProps> = ({
  isOpen,
  onClose,
  destination,
  initialOriginLat,
  initialOriginLng,
}) => {
  // Live GPS state
  const [originLat, setOriginLat] = useState<number>(() => {
    if (initialOriginLat && !isNaN(initialOriginLat)) return initialOriginLat;
    try {
      const saved = localStorage.getItem('taskhub_live_gps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat) return parsed.lat;
      }
    } catch {}
    return 13.0827; // Baseline
  });

  const [originLng, setOriginLng] = useState<number>(() => {
    if (initialOriginLng && !isNaN(initialOriginLng)) return initialOriginLng;
    try {
      const saved = localStorage.getItem('taskhub_live_gps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lng) return parsed.lng;
      }
    } catch {}
    return 80.2707;
  });

  const [originAddress, setOriginAddress] = useState<string>('Detecting live location...');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (window as any).__TASKHUB_MAPS_KEY__ ||
    'AIzaSyAG7STglqzPFS3hz35Id-pj8WKE8e0p_0o';

  // Acquire high accuracy live GPS
  const acquireLiveGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your device browser.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy);

        setOriginLat(lat);
        setOriginLng(lng);
        setGpsAccuracy(acc);
        setIsLocating(false);

        try {
          localStorage.setItem('taskhub_live_gps', JSON.stringify({ lat, lng, timestamp: Date.now() }));
        } catch {}

        try {
          const res = await api.reverseGeocode(lat, lng);
          if (res.formattedAddress) {
            setOriginAddress(res.formattedAddress);
          } else {
            setOriginAddress(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } catch {
          setOriginAddress(`Current GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      },
      (err) => {
        setIsLocating(false);
        setGpsError(`Unable to read live GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  }, []);

  useEffect(() => {
    if (isOpen) {
      acquireLiveGps();
    }
  }, [isOpen, acquireLiveGps]);

  if (!isOpen) return null;

  // Calculate Haversine distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const straightDistanceKm = calculateDistance(originLat, originLng, destination.lat, destination.lng);
  // Realistic road routing multiplier ~ 1.25x
  const roadDistanceKm = Math.round(straightDistanceKm * 1.25 * 10) / 10;
  // Estimated driving time (approx 30 km/h in urban streets)
  const estMinutes = Math.max(2, Math.round((roadDistanceKm / 30) * 60));
  // Walking time (approx 4.5 km/h)
  const walkingMinutes = Math.round((roadDistanceKm / 4.5) * 60);

  // Map center between origin and destination
  const midLat = (originLat + destination.lat) / 2;
  const midLng = (originLng + destination.lng) / 2;

  // Google Maps external navigation URL
  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  Live GPS Route & Navigation
                </span>
                {gpsAccuracy !== null && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Accuracy ±{gpsAccuracy}m
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-white mt-1 leading-tight truncate max-w-md sm:max-w-xl">
                {destination.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Origin & Destination Comparison Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Origin (Live GPS) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    Your Live Origin (GPS)
                  </span>
                </div>
                <button
                  onClick={acquireLiveGps}
                  disabled={isLocating}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Refresh GPS"
                >
                  <RotateCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="text-xs text-white font-medium line-clamp-2">
                {originAddress}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {originLat.toFixed(6)}, {originLng.toFixed(6)}
              </div>
            </div>

            {/* Destination (Job Venue) */}
            <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Target Work Venue
                </span>
              </div>

              <div className="text-xs text-white font-medium line-clamp-2">
                {destination.fullAddress}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {destination.lat.toFixed(6)}, {destination.lng.toFixed(6)}
              </div>
            </div>
          </div>

          {gpsError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Quick Route Metrics Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                <Navigation className="w-3.5 h-3.5 text-indigo-400" />
                Distance
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-white">
                {roadDistanceKm} <span className="text-xs font-normal text-slate-400">km</span>
              </div>
              <div className="text-[10px] text-slate-500">~{straightDistanceKm.toFixed(1)} km direct</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                Driving ETA
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                {estMinutes} <span className="text-xs font-normal text-slate-400">mins</span>
              </div>
              <div className="text-[10px] text-slate-500">at normal urban speed</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Walking ETA
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-cyan-400">
                {walkingMinutes < 60 ? `${walkingMinutes}m` : `${Math.floor(walkingMinutes / 60)}h ${walkingMinutes % 60}m`}
              </div>
              <div className="text-[10px] text-slate-500">pedestrian transit</div>
            </div>
          </div>

          {/* Real Interactive Route Map */}
          <div className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative shadow-inner">
            <APIProvider apiKey={apiKey} solutionChannel="GMP_visgl_rgm_v1_default">
              <Map
                style={{ width: '100%', height: '100%' }}
                defaultCenter={{ lat: midLat, lng: midLng }}
                defaultZoom={straightDistanceKm > 30 ? 9 : straightDistanceKm > 10 ? 11 : 13}
                mapId="DEMO_MAP_ID"
                gestureHandling="greedy"
                disableDefaultUI={false}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              >
                {/* Live Origin Marker */}
                <AdvancedMarker position={{ lat: originLat, lng: originLng }} title="Your Live Location">
                  <div className="relative flex flex-col items-center group cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-blue-600/50">
                      <Navigation className="w-4 h-4 fill-current" />
                    </div>
                    <div className="absolute bottom-9 bg-slate-950 border border-blue-500/50 rounded-lg px-2 py-0.5 text-[10px] text-blue-300 whitespace-nowrap shadow-xl">
                      Live GPS Origin
                    </div>
                  </div>
                </AdvancedMarker>

                {/* Target Destination Marker */}
                <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }} title={destination.title}>
                  <div className="relative flex flex-col items-center group cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-rose-600/50 animate-bounce">
                      <MapPin className="w-5 h-5 drop-shadow" />
                    </div>
                    <div className="absolute bottom-10 bg-slate-950 border border-rose-500/50 rounded-lg px-2 py-0.5 text-[10px] text-rose-300 whitespace-nowrap shadow-xl">
                      Job Venue
                    </div>
                  </div>
                </AdvancedMarker>
              </Map>
            </APIProvider>

            {/* Geofence Check-in Reminder Overlay */}
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 backdrop-blur shadow-xl flex items-center gap-2 pointer-events-none">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                200m Geofenced Check-In: {straightDistanceKm <= 0.2 ? '✅ You are within on-site check-in range!' : `📍 Arrive within 200m of venue to trigger instant verified check-in.`}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 text-center sm:text-left">
            <Compass className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Real-time GPS coordinates synced with browser navigation API.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>

            <a
              href={googleMapsNavUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Start Live GPS Navigation</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
