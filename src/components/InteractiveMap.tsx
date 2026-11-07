import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Compass,
  Search,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Layers,
  Crosshair,
  ArrowRight,
  Building,
  Wrench,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { getCurrentDeviceLocation } from '../utils/geolocation.ts';

export interface MapMarker {
  id: string;
  title: string;
  lat: number;
  lng: number;
  category?: string;
  price?: number;
  paymentBasis?: string;
  workDate?: string;
  shiftTime?: string;
  duration?: string;
  workLocation?: string;
  confirmedWorkers?: number;
  requiredWorkers?: number;
  isFilled?: boolean;
  distanceKm?: number;
  hostName?: string;
  isCenter?: boolean;
}

interface InteractiveMapProps {
  initialLat?: number;
  initialLng?: number;
  selectedLat?: number;
  selectedLng?: number;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  radiusKm?: number | string;
  bufferKm?: number;
  showRadarBoundary?: boolean;
  workshopLat?: number;
  workshopLng?: number;
  workshopAddress?: string;
  showWorkshopPin?: boolean;
  markers?: MapMarker[];
  readOnly?: boolean;
  height?: string;
  onMarkerClick?: (marker: MapMarker) => void;
  activeMarkerId?: string | null;
  onMarkerAction?: (marker: MapMarker) => void;
  actionButtonText?: string;
}

// Inner helper to synchronize camera when selected coordinates change
const MapCameraControl: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (map && !isNaN(lat) && !isNaN(lng)) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);
  return null;
};

// Inner helper to draw Google Maps Radar Circles (Core Radius + Extended Buffer Zone)
const MapRadarOverlay: React.FC<{
  lat: number;
  lng: number;
  radiusKm: number;
  bufferKm?: number;
  enabled?: boolean;
}> = ({ lat, lng, radiusKm, bufferKm = 0, enabled = true }) => {
  const map = useMap();
  const coreCircleRef = useRef<any>(null);
  const bufferCircleRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !(window as any).google?.maps || !enabled || isNaN(lat) || isNaN(lng)) return;

    const googleMaps = (window as any).google.maps;
    const center = { lat, lng };
    const numRadius = typeof radiusKm === 'number' ? radiusKm : parseFloat(String(radiusKm)) || 10;
    const numBuffer = typeof bufferKm === 'number' ? bufferKm : parseFloat(String(bufferKm)) || 0;

    // 1. Core Operating Radius Circle (Cyan)
    if (!coreCircleRef.current) {
      coreCircleRef.current = new googleMaps.Circle({
        strokeColor: '#06b6d4',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: '#06b6d4',
        fillOpacity: 0.12,
        map,
        center,
        radius: numRadius * 1000,
      });
    } else {
      coreCircleRef.current.setCenter(center);
      coreCircleRef.current.setRadius(numRadius * 1000);
      coreCircleRef.current.setMap(map);
    }

    // 2. Extended Buffer Zone Circle (Amber)
    if (numBuffer > 0) {
      const totalMeters = (numRadius + numBuffer) * 1000;
      if (!bufferCircleRef.current) {
        bufferCircleRef.current = new googleMaps.Circle({
          strokeColor: '#f59e0b',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#f59e0b',
          fillOpacity: 0.05,
          map,
          center,
          radius: totalMeters,
        });
      } else {
        bufferCircleRef.current.setCenter(center);
        bufferCircleRef.current.setRadius(totalMeters);
        bufferCircleRef.current.setMap(map);
      }
    } else if (bufferCircleRef.current) {
      bufferCircleRef.current.setMap(null);
    }

    return () => {
      coreCircleRef.current?.setMap(null);
      bufferCircleRef.current?.setMap(null);
    };
  }, [map, lat, lng, radiusKm, bufferKm, enabled]);

  return null;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  initialLat = 13.0827,
  initialLng = 80.2707,
  selectedLat,
  selectedLng,
  onLocationSelect,
  radiusKm = 20,
  bufferKm = 0,
  showRadarBoundary = false,
  workshopLat,
  workshopLng,
  workshopAddress,
  showWorkshopPin = false,
  markers = [],
  readOnly = false,
  height = '420px',
  onMarkerClick,
  activeMarkerId,
  onMarkerAction,
  actionButtonText = 'View Details & Apply',
}) => {
  const [currentLat, setCurrentLat] = useState<number>(selectedLat !== undefined ? selectedLat : initialLat);
  const [currentLng, setCurrentLng] = useState<number>(selectedLng !== undefined ? selectedLng : initialLng);
  const [addressInput, setAddressInput] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ description: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (window as any).__TASKHUB_MAPS_KEY__ ||
    'AIzaSyAG7STglqzPFS3hz35Id-pj8WKE8e0p_0o';

  // Listen for Google Maps quota error event
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    if (selectedLat !== undefined && selectedLng !== undefined) {
      setCurrentLat(selectedLat);
      setCurrentLng(selectedLng);
    }
  }, [selectedLat, selectedLng]);

  useEffect(() => {
    if (activeMarkerId) {
      const match = markers.find((m) => m.id === activeMarkerId);
      if (match) {
        setActiveMarker(match);
        setCurrentLat(match.lat);
        setCurrentLng(match.lng);
      }
    }
  }, [activeMarkerId, markers]);

  // Handle address input typing with debounced autocomplete suggestions
  const handleInputChange = async (val: string) => {
    setAddressInput(val);
    setSearchError(null);
    if (val.trim().length >= 3) {
      try {
        const res = await api.autocompleteAddress(val);
        if (res.suggestions && res.suggestions.length > 0) {
          setSuggestions(res.suggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Perform smooth geocoding search without triggering form resets or page refreshes
  const handleSearchAddress = async (targetQuery?: string, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const query = typeof targetQuery === 'string' ? targetQuery : addressInput;
    if (!query || !query.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setShowSuggestions(false);

    try {
      const res = await api.geocodeAddress(query.trim());
      if (res.success && res.lat !== undefined && res.lng !== undefined) {
        setCurrentLat(res.lat);
        setCurrentLng(res.lng);
        setResolvedAddress(res.formattedAddress || query);
        setAddressInput(res.formattedAddress || query);

        // Smooth success feedback
        setToastInfo({
          type: 'success',
          message: `✓ Centered map to: ${res.formattedAddress || query}`,
        });
        setTimeout(() => setToastInfo(null), 3500);

        if (onLocationSelect) {
          onLocationSelect(res.lat, res.lng, res.formattedAddress || query);
        }
      } else {
        const errorMsg = 'Location not found, please check the address';
        setSearchError(errorMsg);
        setToastInfo({
          type: 'error',
          message: errorMsg,
        });
        setTimeout(() => setToastInfo(null), 4500);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Location not found, please check the address';
      setSearchError(errorMsg);
      setToastInfo({
        type: 'error',
        message: errorMsg,
      });
      setTimeout(() => setToastInfo(null), 4500);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle map click
  const handleMapClick = useCallback(
    async (e: any) => {
      if (readOnly) return;
      const latLng = e.detail?.latLng;
      if (!latLng) return;

      const newLat = parseFloat(latLng.lat.toFixed(6));
      const newLng = parseFloat(latLng.lng.toFixed(6));

      setCurrentLat(newLat);
      setCurrentLng(newLng);
      setSearchError(null);

      try {
        const res = await api.reverseGeocode(newLat, newLng);
        const addr = res.formattedAddress || `Coordinates: ${newLat}, ${newLng}`;
        setResolvedAddress(addr);
        setAddressInput(addr);
        if (onLocationSelect) {
          onLocationSelect(newLat, newLng, addr);
        }
      } catch {
        if (onLocationSelect) {
          onLocationSelect(newLat, newLng);
        }
      }
    },
    [readOnly, onLocationSelect]
  );

  // Acquire current device GPS with high accuracy and zero cache tolerance
  const handleUseMyLocation = async () => {
    setIsLocating(true);
    setSearchError(null);

    try {
      const loc = await getCurrentDeviceLocation();
      setCurrentLat(loc.latitude);
      setCurrentLng(loc.longitude);
      const addr = loc.formattedAddress || `GPS Location (${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)})`;
      setResolvedAddress(addr);
      setAddressInput(addr);
      if (onLocationSelect) {
        onLocationSelect(loc.latitude, loc.longitude, addr);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Unable to retrieve live device GPS. Please verify location permissions.');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Address Search & GPS Action Bar */}
      <div className="p-3.5 bg-slate-950 border-b border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white text-xs tracking-wide">
              Google Maps Platform™ Geocoding & Radius Radar
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Locating...' : 'Use My GPS Location'}
            </button>
          </div>
        </div>

        {/* Address Search Bar */}
        {!readOnly && (
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSearchAddress(addressInput, e);
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  placeholder="Search city, area, street, or landmark (e.g. Anna Nagar, Chennai)..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSearchAddress(addressInput, e);
                }}
                disabled={isSearching || !addressInput.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {isSearching ? 'Searching...' : 'Search Address'}
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSearchAddress(s.description, e);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{s.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Non-intrusive Toast Notification Preserving All Form Fields */}
        {toastInfo && (
          <div
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-2 shadow-lg animate-fade-in ${
              toastInfo.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastInfo.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{toastInfo.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastInfo(null)}
              className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Real Interactive Google Map */}
      <div style={{ height }} className="relative w-full bg-slate-950 overflow-hidden">
        <APIProvider apiKey={apiKey} solutionChannel="GMP_visgl_rgm_v1_default">
          <Map
            style={{ width: '100%', height: '100%' }}
            defaultCenter={{ lat: currentLat, lng: currentLng }}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            gestureHandling={readOnly ? 'cooperative' : 'greedy'}
            disableDefaultUI={false}
            onClick={handleMapClick}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          >
            <MapCameraControl lat={currentLat} lng={currentLng} />

            {/* Radar Overlay Boundary Circles - strictly shown only when explicitly enabled (never for Service Seekers) */}
            {showRadarBoundary && (
              <MapRadarOverlay
                lat={workshopLat !== undefined && workshopLng !== undefined ? workshopLat : currentLat}
                lng={workshopLat !== undefined && workshopLng !== undefined ? workshopLng : currentLng}
                radiusKm={typeof radiusKm === 'number' ? radiusKm : parseFloat(String(radiusKm)) || 10}
                bufferKm={bufferKm}
                enabled={showRadarBoundary}
              />
            )}

            {/* Pinned Workshop / Base Dispatch Marker */}
            {showWorkshopPin && workshopLat !== undefined && workshopLng !== undefined && (
              <AdvancedMarker
                position={{ lat: workshopLat, lng: workshopLng }}
                title={workshopAddress || 'Workshop / Base Address'}
              >
                <div className="relative flex flex-col items-center group cursor-pointer z-30">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-600 border-2 border-white flex items-center justify-center text-white shadow-2xl shadow-cyan-500/50">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div className="hidden group-hover:block absolute bottom-12 bg-slate-950 border border-cyan-500/50 rounded-xl p-2 text-xs text-white whitespace-nowrap shadow-2xl z-40">
                    <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" /> Pinned Workshop / Dispatch Hub
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">{workshopAddress || 'Physical Workshop'}</div>
                    <div className="text-[9px] font-mono text-slate-500">{workshopLat.toFixed(4)}, {workshopLng.toFixed(4)}</div>
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* Center Selected Pin */}
            <AdvancedMarker
              position={{ lat: currentLat, lng: currentLng }}
              title={resolvedAddress || 'Selected Work/Service Location'}
            >
              <div className="relative flex flex-col items-center group cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-indigo-600/50 animate-bounce">
                  <MapPin className="w-5 h-5 drop-shadow" />
                </div>
                <div className="hidden group-hover:block absolute bottom-11 bg-slate-950 border border-indigo-500/50 rounded-lg px-2.5 py-1 text-[11px] text-white whitespace-nowrap shadow-2xl z-40">
                  <span className="font-bold text-indigo-300">Selected Location</span>
                  <div className="text-[10px] text-slate-400">{currentLat.toFixed(4)}, {currentLng.toFixed(4)}</div>
                </div>
              </div>
            </AdvancedMarker>

            {/* Additional Result Markers (Gigs or Tech Partners) */}
            {markers.map((m) => {
              const isSelected = activeMarker?.id === m.id || activeMarkerId === m.id;
              return (
                <AdvancedMarker
                  key={m.id}
                  position={{ lat: m.lat, lng: m.lng }}
                  onClick={() => {
                    setActiveMarker(m);
                    if (onMarkerClick) onMarkerClick(m);
                  }}
                >
                  <div className="relative flex flex-col items-center group cursor-pointer">
                    <div
                      className={`w-9 h-9 rounded-full border-2 border-white flex items-center justify-center shadow-xl transform hover:scale-125 transition ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/40 scale-110 z-30'
                          : m.isFilled
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      <MapPin className="w-5 h-5 fill-current" />
                    </div>
                    {/* Hover tooltip */}
                    <div className="hidden group-hover:block absolute bottom-11 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-white whitespace-nowrap shadow-2xl z-40">
                      <div className="font-bold">{m.title}</div>
                      {m.price !== undefined && (
                        <div className="text-emerald-400 font-mono text-[10px]">
                          ${m.price} {m.paymentBasis ? `(${m.paymentBasis})` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Marker InfoWindow Popup */}
            {activeMarker && (
              <InfoWindow
                position={{ lat: activeMarker.lat, lng: activeMarker.lng }}
                onCloseClick={() => setActiveMarker(null)}
              >
                <div className="p-3 text-slate-900 max-w-[280px] space-y-2 font-sans">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 truncate">
                      {activeMarker.category || 'Opportunity'}
                    </span>
                    {activeMarker.distanceKm !== undefined && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                        {activeMarker.distanceKm < 1
                          ? `${Math.round(activeMarker.distanceKm * 1000)}m away`
                          : `${activeMarker.distanceKm} km away`}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-950 leading-snug line-clamp-2">
                      {activeMarker.title}
                    </h4>
                    {activeMarker.hostName && (
                      <div className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                        🏢 {activeMarker.hostName}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-xs pt-1 border-t border-slate-200">
                    {activeMarker.price !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Compensation:</span>
                        <span className="text-emerald-700 font-black font-mono">
                          ${activeMarker.price} {activeMarker.paymentBasis ? `(${activeMarker.paymentBasis})` : ''}
                        </span>
                      </div>
                    )}
                    {activeMarker.workDate && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">Shift Date:</span>
                        <span className="font-semibold text-slate-800">
                          {activeMarker.workDate} {activeMarker.shiftTime ? `(${activeMarker.shiftTime})` : ''}
                        </span>
                      </div>
                    )}
                    {activeMarker.workLocation && (
                      <div className="text-[11px] text-slate-600 truncate">
                        📍 {activeMarker.workLocation}
                      </div>
                    )}
                    {activeMarker.requiredWorkers !== undefined && (
                      <div className="text-[11px] font-medium text-slate-700">
                        Slots: <strong className="text-blue-700">{activeMarker.confirmedWorkers || 0}/{activeMarker.requiredWorkers}</strong> confirmed {activeMarker.isFilled ? '(Waitlist Active)' : ''}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onMarkerClick) onMarkerClick(activeMarker);
                      if (onMarkerAction) onMarkerAction(activeMarker);
                    }}
                    className="w-full mt-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{actionButtonText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-300 space-y-1 backdrop-blur shadow-2xl pointer-events-none z-10">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
            <span className="font-medium text-white">Your Selected Pin</span>
          </div>
          {markers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <span>Available Jobs / Partners ({markers.length})</span>
            </div>
          )}
          {!readOnly && (
            <div className="text-[10px] text-slate-400 pt-0.5">Click anywhere on the map to relocate pin</div>
          )}
        </div>
      </div>

      {/* Lat/Lng and Selected Address Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-3 font-mono">
          <span>
            LAT: <strong className="text-white">{currentLat.toFixed(6)}</strong>
          </span>
          <span>
            LNG: <strong className="text-white">{currentLng.toFixed(6)}</strong>
          </span>
        </div>
        <div className="text-[11px] text-indigo-400 font-semibold truncate max-w-sm">
          {resolvedAddress || (radiusKm === 'all' || radiusKm === 'global' ? 'Scope: Global Gigs (Worldwide)' : `Radius Scope: ${radiusKm} km`)}
        </div>
      </div>
    </div>
  );
};
