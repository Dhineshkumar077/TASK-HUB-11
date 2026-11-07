/**
 * Geospatial calculations for TaskHub
 * Implements Haversine distance formula in kilometers and meters
 */

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 100) / 100; // Round to 2 decimal places
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return Math.round(calculateDistanceKm(lat1, lon1, lat2, lon2) * 1000);
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Validates if coordinates fall within 10 to 15 km search radius (default 10 km)
 */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  targetLat: number,
  targetLng: number,
  radiusKm = 10
): boolean {
  const dist = calculateDistanceKm(centerLat, centerLng, targetLat, targetLng);
  return dist <= radiusKm;
}

/**
 * Validates geofence for on-site attendance (default 200 meters)
 */
export function isWithinGeofence(
  siteLat: number,
  siteLng: number,
  userLat: number,
  userLng: number,
  allowedRadiusMeters = 200
): { valid: boolean; distanceMeters: number } {
  const distanceMeters = calculateDistanceMeters(siteLat, siteLng, userLat, userLng);
  return {
    valid: distanceMeters <= allowedRadiusMeters,
    distanceMeters
  };
}
