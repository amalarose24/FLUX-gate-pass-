/**
 * spatialHelper.js  –  Turf.js spatial matching (with explicit lng/lat swap)
 *
 * CRITICAL: Turf.js uses GeoJSON which is strictly [longitude, latitude].
 * Our app convention is [latitude, longitude].
 * This helper explicitly .map()s and swaps every coordinate before
 * passing to Turf functions.
 *
 * Usage:
 *   const { isSeekerOnTheWay } = require('./spatialHelper');
 *   const match = isSeekerOnTheWay([10.05, 76.33], providerRoute, 3);
 *
 * Requires: npm install @turf/turf
 */

const turf = require('@turf/turf');

/**
 * Check if a seeker's [lat, lng] falls within `maxDeviationInKm` of
 * any part of the provider's driving route.
 *
 * @param {[number,number]}     seekerCoords       – [lat, lng]
 * @param {[number,number][]}   providerRouteArray – array of [lat, lng] from OSRM
 * @param {number}              [maxDeviationInKm=3] – buffer radius in km
 * @returns {boolean}
 */
function isSeekerOnTheWay(seekerCoords, providerRouteArray, maxDeviationInKm = 3) {
  // Guard: need at least 2 points to form a line
  if (!providerRouteArray || providerRouteArray.length < 2) {
    return false;
  }
  if (!seekerCoords || seekerCoords.length < 2) {
    return false;
  }

  // =====================================================
  // THE FIX: Swap from [lat, lng] → [lng, lat] for Turf
  // =====================================================

  // Seeker point: [lat, lng] → [lng, lat]
  const seekerPoint = turf.point([seekerCoords[1], seekerCoords[0]]);

  // Route line: map each [lat, lng] → [lng, lat]
  const routeCoords = providerRouteArray.map(coord => [coord[1], coord[0]]);
  const routeLine = turf.lineString(routeCoords);

  // Calculate perpendicular distance from point to line (in km)
  const distanceKm = turf.pointToLineDistance(seekerPoint, routeLine, {
    units: 'kilometers',
  });

  console.log(` Spatial check: seeker [${seekerCoords}] is ${distanceKm.toFixed(2)}km from route (threshold: ${maxDeviationInKm}km) → ${distanceKm <= maxDeviationInKm ? 'MATCH' : 'NO MATCH'}`);

  return distanceKm <= maxDeviationInKm;
}

module.exports = { isSeekerOnTheWay };
