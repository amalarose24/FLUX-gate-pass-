const axios = require('axios');
const turf = require('@turf/turf');

/**
 * Fetches the driving route geometry from the free OSRM API.
 * 
 * @param {Array} startCoords - The [longitude, latitude] of the starting point.
 * @param {Array} endCoords - The [longitude, latitude] of the destination.
 * @returns {Array} - An array of [lng, lat] coordinates representing the route geometry.
 */
async function fetchProviderRoute(startCoords, endCoords) {
    try {
        // Sanitize coordinates to strictly be [lng, lat]
        // In India, Latitude is < 20. If the first number is < 20, it's [lat, lng] and needs swapping.
        const sanitizeCoord = (coord) => {
            if (coord[0] < 20) {
                return [coord[1], coord[0]]; // Swap to [lng, lat]
            }
            return coord; // Already [lng, lat]
        };

        const safeStart = sanitizeCoord(startCoords);
        const safeEnd = sanitizeCoord(endCoords);

        // OSRM strictly expects lng,lat;lng,lat
        const coordsString = `${safeStart[0]},${safeStart[1]};${safeEnd[0]},${safeEnd[1]}`;
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

        console.log(`[OSRM] Fetching route: ${osrmUrl}`);

        const response = await axios.get(osrmUrl);

        if (response.data.code !== 'Ok' || !response.data.routes.length) {
            console.warn('[OSRM] Error: No valid route found.');
            return [];
        }

        const routeGeometry = response.data.routes[0].geometry.coordinates;
        console.log(`[OSRM] Success! Route generated with ${routeGeometry.length} coordinate points.`);

        return routeGeometry;

    } catch (error) {
        console.error('[OSRM] Failed to fetch route:', error.message);
        return [];
    }
}

/**
 * Checks if a seeker's pickup location is within 4km of the provider's route.
 * 
 * @param {Array} seekerCoords - The [longitude, latitude] of the seeker's location.
 * @param {Array} providerRouteGeometry - The array of [lng, lat] coordinates representing the provider's route.
 * @returns {boolean} - Returns true if the seeker is within the max distance.
 */
function checkMatch(seekerCoords, providerRouteGeometry) {
    if (!providerRouteGeometry || providerRouteGeometry.length < 2) {
        console.warn('[Turf.js] Error: Provider route geometry is invalid or too short to form a line.');
        return false;
    }

    try {
        // Sanitize coordinates to strictly be [lng, lat]
        // In India, Latitude is < 20. If the first number is < 20, it's [lat, lng] and needs swapping.
        const sanitizeCoord = (coord) => {
            if (coord[0] < 20) {
                return [coord[1], coord[0]]; // Swap to [lng, lat]
            }
            return coord; // Already [lng, lat]
        };

        const safeSeekerCoords = sanitizeCoord(seekerCoords);
        const safeProviderRoute = providerRouteGeometry.map(sanitizeCoord);

        // Convert the raw coordinates into precise Turf.js geometries. 
        // Note: Strict [lng, lat] order is maintained.
        const seekerPoint = turf.point(safeSeekerCoords);
        const routeLine = turf.lineString(safeProviderRoute);

        console.log('--- START TURF MATCHING CALCULATION ---');
        console.log('Seeker Point [lng, lat]:', safeSeekerCoords);
        console.log('Route Geometry Length:', safeProviderRoute.length);
        console.log('Route Sample [lng, lat]:', safeProviderRoute.slice(0, 3));

        // Check the shortest distance from the seeker point to the route line
        const distance = turf.pointToLineDistance(seekerPoint, routeLine, { units: 'kilometers' });

        console.log(`[Turf.js] Calculated distance to route: ${distance.toFixed(2)} km`);

        // Generous maximum distance of 4km to account for highway bypasses
        const maxDistance = 4;
        const isMatch = distance <= maxDistance;

        if (isMatch) {
            console.log('[Turf.js] Match Found! Seeker is within range.');
        } else {
            console.log('[Turf.js] No Match. Seeker is too far from the route.');
        }

        return isMatch;

    } catch (error) {
        console.error('[Turf.js] Failed to calculate match distance:', error.message);
        return false;
    }
}

module.exports = {
    fetchProviderRoute,
    checkMatch
};
