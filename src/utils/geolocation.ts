import { api } from '../services/api.ts';

export interface PreciseLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  formattedAddress?: string;
}

/**
 * High-accuracy live GPS acquisition across all 4 portals.
 * Uses native navigator.geolocation.getCurrentPosition with:
 * - enableHighAccuracy: true
 * - timeout: 15000ms
 * - maximumAge: 0 (zero cache tolerance to guarantee fresh device coordinates)
 */
export function getCurrentDeviceLocation(): Promise<PreciseLocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your device or browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = parseFloat(position.coords.latitude.toFixed(6));
        const longitude = parseFloat(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy);

        // Cache live coordinates in localStorage for cross-component continuity
        try {
          localStorage.setItem(
            'taskhub_live_gps',
            JSON.stringify({
              lat: latitude,
              lng: longitude,
              accuracy,
              timestamp: Date.now(),
            })
          );
        } catch {
          // Ignore localStorage errors in restricted environments
        }

        // Try reverse geocoding to retrieve human-readable address
        let formattedAddress: string | undefined;
        try {
          const res = await api.reverseGeocode(latitude, longitude);
          if (res?.formattedAddress) {
            formattedAddress = res.formattedAddress;
          }
        } catch {
          // Fallback if reverse geocoding fails
          formattedAddress = `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        }

        resolve({
          latitude,
          longitude,
          accuracy,
          formattedAddress,
        });
      },
      (error) => {
        let msg = error.message;
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser settings to detect your precise position.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Precise location is temporarily unavailable from device sensors. Please ensure device GPS is turned on.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location acquisition timed out. Please click "Use My GPS Location" again.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Strict zero cache tolerance
      }
    );
  });
}

/**
 * Great-circle distance between two latitude/longitude points in kilometers.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
