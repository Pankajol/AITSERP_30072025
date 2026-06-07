// lib/geofence.js

/**
 * Convert degrees to radians
 */
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Calculate distance between two points on Earth using Haversine formula
 * @returns {number} distance in meters
 */
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a punch location is within the geofence radius of a target point
 * @param {number} punchLat - Latitude of the punch
 * @param {number} punchLng - Longitude of the punch
 * @param {number} siteLat - Latitude of the checkpoint/site
 * @param {number} siteLng - Longitude of the checkpoint/site
 * @param {number} radius - Allowed radius in meters
 * @returns {boolean} true if within geofence, false otherwise
 */
export function isWithinGeofence(punchLat, punchLng, siteLat, siteLng, radius) {
  // If any coordinate is missing, consider it outside (security first)
  if (!punchLat || !punchLng || !siteLat || !siteLng || !radius) {
    return false;
  }
  const distance = getDistanceInMeters(punchLat, punchLng, siteLat, siteLng);
  return distance <= radius;
}