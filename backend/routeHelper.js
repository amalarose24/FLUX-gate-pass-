/**
 * routeHelper.js  –  Driving route fetcher using free OSRM API
 *
 * Usage:
 *   const { fetchDrivingRoute } = require('./routeHelper');
 *
 *   // Both args are [lat, lng]
 *   const routeCoords = await fetchDrivingRoute([10.19, 76.39], [10.01, 76.31]);
 *   // → [[10.19, 76.39], [10.18, 76.38], ..., [10.01, 76.31]]
 *   //   Array of [lat, lng] waypoints along the actual road
 *
 * Uses http://router.project-osrm.org  (free, no API key, rate-limited).
 * Returns an empty array on failure so callers can fall back gracefully.
 */

const OSRM_BASE = 'http://router.project-osrm.org/route/v1/driving';

/**
 * Fetch the actual driving route geometry between two points.
 *
 * @param {[number,number]} startCoords  – [lat, lng] of origin
 * @param {[number,number]} endCoords    – [lat, lng] of destination
 * @returns {Promise<[number,number][]>} – Array of [lat, lng] waypoints
 */
async function fetchDrivingRoute(startCoords, endCoords) {
  try {
    // OSRM expects lng,lat (opposite of our convention)
    const start = `${startCoords[1]},${startCoords[0]}`;
    const end = `${endCoords[1]},${endCoords[0]}`;

    const url = `${OSRM_BASE}/${start};${end}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('OSRM returned no route:', data.code);
      return [];
    }

    // GeoJSON coordinates come as [lng, lat] — convert to [lat, lng]
    const coords = data.routes[0].geometry.coordinates.map(
      ([lng, lat]) => [lat, lng]
    );

    console.log(` OSRM route fetched: ${coords.length} waypoints, ${(data.routes[0].distance / 1000).toFixed(1)} km`);
    return coords;
  } catch (err) {
    console.error(' OSRM fetch failed:', err.message);
    return [];
  }
}

module.exports = { fetchDrivingRoute };
