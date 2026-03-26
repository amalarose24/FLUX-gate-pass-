import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import axios from 'axios';

const DynamicQR = ({ passId, userToken }) => {
    const [qrData, setQrData] = useState(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const fetchQrToken = async () => {
            try {
                // Fetch the 30-second token from the backend
                // Remember to use your actual backend URL here
                const res = await axios.get(`http://localhost:5000/api/pass/qr-token/${passId}`, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                
                setQrData(res.data.qrToken); // Put the encrypted JWT into the QR code
                setIsExpired(false);
            } catch (error) {
                console.error("Failed to fetch QR token");
                setIsExpired(true);
            }
        };

        // Fetch the first token immediately when the page loads
        fetchQrToken();

        // Set an interval to fetch a fresh token every 25 seconds
        const interval = setInterval(fetchQrToken, 25000);

        // Cleanup the timer if the user closes the page so it doesn't leak memory
        return () => clearInterval(interval);
    }, [passId, userToken]);

    return (
        <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-bold text-lg text-gray-700 mb-2">Secure Gate Pass</h3>
            
            {qrData ? (
                <div className="p-2 border-4 border-teal-500 rounded-lg relative">
                    <QRCodeCanvas value={qrData} size={200} />
                    {/* Blinking green dot to prove to guards that the app is live */}
                    <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                </div>
            ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-200">
                    <p className="text-gray-500">Loading Secure QR...</p>
                </div>
            )}

            {isExpired ? (
                <p className="text-red-500 font-bold mt-3 text-sm">Connection Lost. Cannot generate QR.</p>
            ) : (
                <p className="text-gray-500 mt-3 text-xs flex items-center gap-1">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refreshes automatically every 30s
                </p>
            )}
        </div>
    );
};

export default DynamicQR;