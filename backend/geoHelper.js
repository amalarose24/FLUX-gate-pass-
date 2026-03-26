/**
 * geoHelper.js  –  Standalone spatial route-matching helper
 * 
 * Usage:
 *   const { isLocationOnRoute } = require('./geoHelper');
 *
 *   // passengerLatLng  = [lat, lng]          (e.g. [10.0452, 76.3284])
 *   // driverRoute      = [[lat,lng], ...]    (ordered array of waypoints / polyline coords)
 *   // maxDistanceKm    = buffer radius in km (default 2)
 *
 *   const match = isLocationOnRoute([10.05, 76.33], driverRoute, 2);
 *   // → true  if the passenger is within 2 km of any segment of the driver's route
 *
 * Zero external dependencies – uses the Haversine formula directly.
 * If you later install @turf/turf you can swap in turf.pointToLineDistance() instead.
 */

// ─── Haversine distance (km) between two [lat, lng] points ───────────────────
function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371; // Earth radius in km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Perpendicular distance from a point to a line segment (km) ──────────────
// Projects the point onto the segment A→B and returns the distance
// to the nearest point on that segment (clamped to endpoints).
function pointToSegmentKm(point, segA, segB) {
  // Convert to a flat approximation (good enough for short segments < 50 km)
  const toXY = ([lat, lng]) => [lng * Math.cos((lat * Math.PI) / 180), lat];
  const p = toXY(point);
  const a = toXY(segA);
  const b = toXY(segB);

  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0) {
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t)); // clamp to segment
  }

  // Closest point on segment in lat/lng
  const closest = [
    segA[0] + t * (segB[0] - segA[0]),
    segA[1] + t * (segB[1] - segA[1]),
  ];

  return haversineKm(point, closest);
}

// ─── Main export ─────────────────────────────────────────────────────────────
/**
 * Returns `true` if `passengerLatLng` falls within `maxDistanceKm` of any
 * segment of `driverRoutePolyline`.
 *
 * @param {[number,number]}       passengerLatLng       – [lat, lng]
 * @param {[number,number][]}     driverRoutePolyline   – array of [lat, lng] waypoints
 * @param {number}                [maxDistanceKm=2]     – buffer radius in km
 * @returns {boolean}
 */
function isLocationOnRoute(passengerLatLng, driverRoutePolyline, maxDistanceKm = 2) {
  if (!driverRoutePolyline || driverRoutePolyline.length < 2) {
    // If the "route" is a single point, fall back to simple radius check
    if (driverRoutePolyline && driverRoutePolyline.length === 1) {
      return haversineKm(passengerLatLng, driverRoutePolyline[0]) <= maxDistanceKm;
    }
    return false;
  }

  for (let i = 0; i < driverRoutePolyline.length - 1; i++) {
    const dist = pointToSegmentKm(
      passengerLatLng,
      driverRoutePolyline[i],
      driverRoutePolyline[i + 1]
    );
    if (dist <= maxDistanceKm) return true; // early exit
  }

  return false;
}

module.exports = { isLocationOnRoute, haversineKm };
