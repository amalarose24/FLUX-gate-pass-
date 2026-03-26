const { fetchProviderRoute, checkMatch } = require('./rideMatchingUtils');

async function test() {
    // Campus (FISAT)
    const startCoords = [10.1489, 76.3613];

    // Ernakulam destination from DB [lat, lng]
    const destCoords = [10.0383947, 76.5074145];

    // Aluva Seeker [lat, lng] -> [10.11, 76.35]
    const seekerAluva = [10.11, 76.35];

    console.log('Fetching OSRM route...');
    const providerRoute = await fetchProviderRoute(startCoords, destCoords);

    if (providerRoute.length > 0) {
        console.log('Route fetched successfully. Testing match for Aluva...');
        // Remember checkMatch expects [lng, lat]
        const isMatch = checkMatch([seekerAluva[1], seekerAluva[0]], providerRoute);
        console.log('Is Aluva a match?', isMatch);
    } else {
        console.log('Failed to fetch route.');
    }
}

test();
