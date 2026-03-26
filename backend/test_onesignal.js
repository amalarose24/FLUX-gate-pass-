require('dotenv').config();
const axios = require('axios');

async function testPush() {
    const appId = process.env.ONESIGNAL_APP_ID?.trim();
    const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();

    console.log("App ID length:", appId?.length);
    console.log("API Key length:", apiKey?.length);
    console.log("Testing with Key format...");

    try {
        const res = await axios.post('https://onesignal.com/api/v1/notifications', {
            app_id: appId,
            target_channel: "push",
            included_segments: ["Total Subscriptions"],
            headings: { en: "Test" },
            contents: { en: "Test Message" }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${apiKey}`
            }
        });
        console.log("SUCCESS with Key:", res.data);
    } catch (e) {
        console.error("FAILED with Key:", e.response?.data || e.message);
    }

    console.log("\nTesting with Basic format...");
    try {
        const res = await axios.post('https://onesignal.com/api/v1/notifications', {
            app_id: appId,
            target_channel: "push",
            included_segments: ["Total Subscriptions"],
            headings: { en: "Test" },
            contents: { en: "Test Message" }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${apiKey}`
            }
        });
        console.log("SUCCESS with Basic:", res.data);
    } catch (e) {
        console.error("FAILED with Basic:", e.response?.data || e.message);
    }
}

testPush();
