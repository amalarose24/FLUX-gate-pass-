FLUX: Automated Campus Access Control and Travel Support

FLUX is a comprehensive, digitized Gate Pass Management Application integrated with an ad-hoc Smart Transport Matching System. Built on the MERN stack, it modernizes campus infrastructure by replacing physical logbooks with dynamic cryptographic QR codes, automated workflow escalations, and algorithmic ride-sharing.

->Features

1) Dynamic Security QR Codes: Headless security scanning using short-lived (30-second expiry) JSON Web Tokens (JWT) to explicitly prevent screenshot spoofing and credential sharing.
2) Smart Transport Matching: Integrates Open Source Routing Machine (OSRM) and Turf.js to geometrically calculate 5km radius overlaps, intelligently matching ride-seekers with ride-providers.
3) Automated Escalation Logic: Utilizes Node-Cron background jobs to automatically reroute pending pass requests to backup administrators if ignored for over 60 minutes.
4) Real-Time Analytics: Role-specific dashboards for Wardens and Office Admins featuring live campus traffic visualizations powered by Recharts and Socket.io.
5) Automated Instant Alerts: Integrates a headless WhatsApp Web API (Puppeteer) and OneSignal to dispatch instantaneous departure/entry alerts to parents and push notifications to approvers.
6) Double-Scan Auto-Sync: Scanning a ride-provider's QR code at the gate automatically syncs the exit/entry statuses of all linked passengers.

-> Tech Stack

Frontend:
* React.js (Vite) - Progressive Web App (PWA)
* Tailwind CSS
* Recharts (Data Visualization)

Backend:
* Node.js & Express.js
* JSON Web Tokens (JWT) for RBAC Auth
* Node-Cron (Background scheduling)
* Socket.io (WebSockets)
* Puppeteer (Headless Chromium for WhatsApp Web)

Database:
* MongoDB Atlas
* Mongoose ODM

External APIs & Geospatial Libraries:
* OSRM (Open Source Routing Machine)
* Turf.js (Spatial Geometry Calculations)
* Photon Komoot API (Location Autocomplete)
* OneSignal (Push Notifications)

## Installation & Setup

### Prerequisites
* Node.js (v16 or higher)
* MongoDB Atlas account (or local MongoDB server)
* Git


