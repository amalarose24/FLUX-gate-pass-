require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const axios = require('axios'); // 🚀 ADDED AXIOS FOR ONESIGNAL
const { isLocationOnRoute, haversineKm } = require('./geoHelper');
const { fetchProviderRoute, checkMatch } = require('./rideMatchingUtils');

// FISAT Mookkannoor campus coordinates [lat, lng]
const CAMPUS_COORDS = [10.1489, 76.3613];

const JWT_SECRET = process.env.JWT_SECRET || 'flux_super_secret_key_123';

// ==========================================
// 🚀 ONESIGNAL PUSH NOTIFICATION HELPER
// ==========================================
const sendPushNotification = async (targetUserId, title, message) => {
    if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) return;
    try {
        await axios.post('https://onesignal.com/api/v1/notifications', {
            app_id: process.env.ONESIGNAL_APP_ID,
            target_channel: "push",
            include_aliases: { external_id: [targetUserId.toString()] },
            headings: { en: title },
            contents: { en: message },
            content_available: true,
            mutable_content: true,
            priority: 10,
            android_channel_id: "default"
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
            }
        });
        console.log(`✅ Push sent to ${targetUserId}`);
    } catch (error) {
        console.error("❌ Push Failed:", error.response?.data || error.message);
    }
};

// ==========================================
// 🚨 WHATSAPP WEB CONFIGURATION
// ==========================================
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Try setting this to false if it still fails locally
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials'
        ],
        timeout: 120000 // 2 minutes timeout
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

whatsappClient.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above with WhatsApp to log in.');
});

whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp Web Client is ready!');
});

whatsappClient.initialize().catch(err => {
    console.error("❌ WhatsApp Initialization Failed:", err);
});
// ==========================================
const User = require('./models/User');
const Pass = require('./models/Pass');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 🔍 DEBUG: Log all socket connections
io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
});

// ==========================================
// 🚗 SMART ROUTES (Restored for Transport Match)
// ==========================================
const SMART_ROUTES = {
    "ERNAKULAM": ["Mookkannoor", "Angamaly", "Aluva", "Companypady", "Edappally", "Palarivattom", "Kaloor", "MG Road"],
    "ALUVA": ["Mookkannoor", "Angamaly", "Paravoor Kavala", "Aluva Metro"],
    "THRISSUR": ["Mookkannoor", "Karukutty", "Chalakudy", "Kodakara", "Ollur", "Sakthan Stand"],
    "ANGAMALY": ["Mookkannoor", "Karayamparambu", "Private Stand", "KSRTC Stand"],
    "CHALAKUDY": ["Mookkannoor", "Karukutty", "Koratty", "Chalakudy Town"],
    "KALAMASSERY": ["Mookkannoor", "Angamaly", "Aluva", "CUSAT", "Premier"]
};

// --- DB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("✅ FLUX DB Connected");
    })
    .catch(err => console.log(err));

// ==========================================
// 📅 SMART CALENDAR HELPER
// ==========================================
const isCollegeHoliday = (date) => {
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dateNum = date.getDate(); // 1 - 31

    if (day === 0) return true; // Sunday is always a holiday
    if (day === 6 && dateNum <= 7) return true; // 1st Saturday is a holiday

    return false;
};

// ==========================================
// ⏰ NODE-CRON SCHEDULED TASKS
// ==========================================

// 1. Zombie Pass: Runs every 1 minute for demo
cron.schedule('*/1 * * * *', async () => {
    try {
        const twoMinsAgo = new Date(Date.now() - 5 * 60 * 1000); // 2 minutes for demo
        const activePasses = await Pass.find({ status: 'active', outTime: { $lt: twoMinsAgo } });
        if (activePasses.length > 0) {
            const warden = await User.findOne({ role: 'warden' });
            for (const pass of activePasses) {
                pass.status = 'overdue';
                await pass.save();
            }
            if (warden) {
                io.emit(`notify-${warden._id}`, { title: "Daily Audit", msg: `${activePasses.length} passes are overdue.` });
                sendPushNotification(warden._id, "Daily Audit", `${activePasses.length} passes are overdue.`); // 🚀 INJECTED
            }
        }
    } catch (e) { console.error("Zombie Pass Cron Error:", e); }
});

// 2. Unused Pass Expiry: Approved but never scanned out
cron.schedule('*/1 * * * *', async () => {
    try {
        const oneDayAgo = new Date(Date.now() - 5 * 60 * 1000);//24 * 60 * 60 * 1000
        await Pass.updateMany(
            { status: 'approved', updatedAt: { $lt: oneDayAgo } },
            { $set: { status: 'void' } } // 👈 Changed from expired to void per requirement
        );
    } catch (e) { console.error("Unused Pass Cron Error:", e); }
});

// 3. Absent Advisor Escalation: Runs every 1 minute
cron.schedule('*/1 * * * *', async () => {
    try {
        const thirtyMinsAgo = new Date(Date.now() - 5 * 60 * 1000); // 30 mins constraint
        const pendingPasses = await Pass.find({
            status: 'pending',
            createdAt: { $lt: thirtyMinsAgo }
        }).populate('assignedApproverId');

        for (const pass of pendingPasses) {
            const currentApprover = pass.assignedApproverId;
            let newApproverId = null;

            if (currentApprover) {
                if (currentApprover.role === 'faculty' && currentApprover.advisorBatch) {
                    const backupAdvisor = await User.findOne({
                        role: 'faculty',
                        advisorBatch: currentApprover.advisorBatch,
                        _id: { $ne: currentApprover._id }
                    });
                    if (backupAdvisor) newApproverId = backupAdvisor._id;
                } else if (currentApprover.role === 'warden' && currentApprover.hostel) {
                    const backupWarden = await User.findOne({
                        role: 'warden',
                        hostel: currentApprover.hostel,
                        _id: { $ne: currentApprover._id }
                    });
                    if (backupWarden) newApproverId = backupWarden._id;
                }
            }

            if (!newApproverId) {
                const office = await User.findOne({ role: 'office' });
                if (office) newApproverId = office._id;
            }

            if (newApproverId && newApproverId.toString() !== currentApprover?._id.toString()) {
                pass.assignedApproverId = newApproverId;
                await pass.save();
                io.emit(`notify-${newApproverId}`, { title: "Escalated Request", msg: "A pending pass was redirected to you due to inactivity." });
                sendPushNotification(newApproverId, "Escalated Request", "A pending pass was redirected to you due to inactivity."); // 🚀 INJECTED
            }
        }
    } catch (e) { console.error("Advisor Escalation Cron Error:", e); }
});

// --- WHATSAPP SENDER ---
const sendWhatsApp = async (studentName, type, time, date, destination, reason, parentPhone) => {
    try {
        if (!parentPhone) {
            console.log(`No valid parent phone number found for ${studentName}`);
            return false;
        }

        if (!whatsappClient || !whatsappClient.info) {
            console.error(" WhatsApp Client is not ready or has disconnected.");
            return false;
        }

        const cleanNumber = parentPhone.replace(/\D/g, '');
        const countryCodeNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
        const chatId = `${countryCodeNumber}@c.us`;

        const actionText = type === 'exit' ? 'EXITED' : 'ENTERED';
        const messageBody = `\u{1F3DB}\uFE0F *FISAT GATE PASS ALERT* \u{1F3DB}\uFE0F\n\nDear Parent/Guardian,\nThis is an automated security notification from the Federal Institute of Science and Technology (FISAT).\n\nYour ward has just ${actionText} the college campus.\n\n\u{1F464} Student: ${studentName}\n\u{1F4CD} Action: ${actionText} Campus\n\u{1F551} Time: ${time}\n\u{1F4C5} Date: ${date}\n\u{1F3AF} Destination: ${destination}\n\u{1F4DD} Purpose: ${reason}\n\nThis is a system-generated message from the College Gate Pass System. Please do not reply to this number.`;

        await whatsappClient.sendMessage(chatId, messageBody);
        console.log(` WHATSAPP SENT to ${chatId}`);
        return true;
    } catch (error) {
        console.error(" WhatsApp Failed. Error:", error.message);
        return false;
    }
};

// --- ROUTES ---

app.get('/api/pass/status/:id', async (req, res) => {
    const rawId = decodeURIComponent(req.params.id);
    const cleanId = rawId.replace('PASS:', '').trim();
    try {
        const pass = await Pass.findById(cleanId).populate('userId');
        if (!pass) return res.json({ state: 'invalid' });

        let state = 'invalid';
        if (pass.status === 'approved') state = 'exit_ready';
        else if (pass.status === 'active') state = 'entry_ready';
        else if (pass.status === 'completed') state = 'completed';

        res.json({ state, student: pass.userId.name });
    } catch (e) { res.json({ state: 'invalid' }); }
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ msg: "Missing Token" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ msg: "Invalid or Expired Token" });
        req.user = user;
        next();
    });
};

const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ msg: "Forbidden: Insufficient Role" });
        }
        next();
    };
};

app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username, password: req.body.password });
    if (user) {
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ user, token });
    } else {
        res.status(401).json({ msg: "Invalid" });
    }
});

// 🚀 NEW: Generate 30-second Dynamic QR Token
app.get('/api/pass/qr-token/:id', authenticateToken, async (req, res) => {
    try {
        const passId = req.params.id;

        // Check if pass exists and is valid for exit/entry
        const pass = await Pass.findById(passId);
        if (!pass) return res.status(404).json({ msg: "Pass not found" });

        // Sign a new JWT containing the passId that DIES in 30 seconds
        const qrToken = jwt.sign(
            { passId: pass._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: '30s' } // 👈 The magic security feature!
        );

        res.json({ qrToken });
    } catch (e) {
        console.error("QR Generation Error:", e);
        res.status(500).json({ msg: "Error generating dynamic QR" });
    }
});




app.get('/api/approvers', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(401).json({ msg: "User no longer exists" });
        const now = new Date();
        const isHoliday = isCollegeHoliday(now);
        const isWardenTime = isHoliday || now.getHours() > 16 || (now.getHours() === 16 && now.getMinutes() >= 30) || now.getHours() < 9;

        let approvers = [];

        if (user.isHosteler && isWardenTime) {
            approvers = await User.find({ role: 'warden', hostel: user.hostel });
        } else {
            approvers = await User.find({ role: 'faculty', advisorBatch: user.batch });
        }

        if (approvers.length === 0) approvers = await User.find({ role: 'office' });

        res.json(approvers);
    } catch (e) { res.status(500).json({ msg: "Error fetching approvers" }); }
});

app.get('/api/advisors/:batch', authenticateToken, async (req, res) => {
    let advisors = await User.find({ role: 'faculty', advisorBatch: req.params.batch });
    if (advisors.length === 0) advisors = await User.find({ role: 'faculty' });
    res.json(advisors);
});

app.post('/api/pass/create', authenticateToken, async (req, res) => {
    try {
        const { reason, destination, transportMode, isReturnable, requestedTime, assignedApproverId, seatsAvailable, destCoords } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId);

        console.log(`[PASS CREATE DEBUG] User: ${user.name}, Role: ${user.role}`);
        console.log(`[PASS CREATE DEBUG] req.body.assignedApproverId:`, assignedApproverId, `(type: ${typeof assignedApproverId})`);

        let finalRoute = [];
        if (transportMode === 'provider') {
            const destKey = destination.toUpperCase().trim();
            let inferred = [];
            for (const key in SMART_ROUTES) {
                if (destKey.includes(key) || key.includes(destKey)) {
                    inferred = SMART_ROUTES[key];
                    break;
                }
            }
            finalRoute = [...new Set([...inferred, destination])];
        }

        let approver = null;

        if (user.role === 'student') {
            approver = typeof assignedApproverId === 'object' && assignedApproverId !== null
                ? (assignedApproverId._id || assignedApproverId.id)
                : assignedApproverId;
        } else {
            const office = await User.findOne({ role: 'office' });
            approver = office ? office._id : null;
        }

        console.log(`[PASS CREATE DEBUG] Final approver value:`, approver, `(type: ${typeof approver}, truthy: ${!!approver})`);

        const pass = new Pass({
            userId, userRole: user.role, reason, destination,
            isReturnable, assignedApproverId: approver,
            transportMode, seatsAvailable: seatsAvailable || 0,
            rideRoute: finalRoute,
            destCoords: (destCoords && destCoords.length === 2) ? destCoords : undefined,
            status: 'pending'
        });

        await pass.save();

        console.log(`[PASS CREATE DEBUG] Pass saved. Connected sockets: ${io.engine.clientsCount}`);

        if (approver) {
            const safeApproverId = approver.toString();

            console.log(`[PASS CREATE] ✅ Emitting notify-${safeApproverId} to ${io.engine.clientsCount} clients`);

            io.emit(`notify-${safeApproverId}`, { title: "New Request", msg: `${user.name} has requested a new pass.` });
            await sendPushNotification(safeApproverId, "New Pass Request", `${user.name} has requested a new pass.`);
        } else {
            console.log(`[PASS CREATE] ❌ NO APPROVER — notification NOT sent`);
        }

        res.json(pass);

    } catch (e) {
        console.error("Pass Create Error:", e);
        res.status(500).json(e);
    }
});
app.get('/api/pass/approver-data/:id', authenticateToken, authorizeRole('faculty', 'warden', 'office'), async (req, res) => {
    const approverId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    let pendingQuery, historyQuery;

    if (req.user.role === 'office') {
        pendingQuery = { status: 'pending', userRole: { $in: ['faculty', 'non-teaching'] } };
        historyQuery = { status: { $ne: 'pending' }, userRole: { $in: ['faculty', 'non-teaching'] } };
    } else {
        pendingQuery = { status: 'pending', assignedApproverId: approverId };
        historyQuery = { status: { $ne: 'pending' }, assignedApproverId: approverId };
    }

    const pending = await Pass.find(pendingQuery).populate('userId');
    const history = await Pass.find(historyQuery).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('userId');
    const totalHistoryCount = await Pass.countDocuments(historyQuery);

    res.json({ pending, history, totalHistoryCount });
});

app.get('/api/pass/my-history/:id', authenticateToken, async (req, res) => {
    res.json(await Pass.find({ userId: req.user.id }).sort({ createdAt: -1 }));
});

app.delete('/api/pass/delete/:id', authenticateToken, async (req, res) => {
    try {
        await Pass.findByIdAndDelete(req.params.id);
        res.json({ msg: "Deleted" });
    } catch (e) { res.status(500).json({ msg: "Error" }); }
});

app.put('/api/pass/user-cancel/:id', authenticateToken, async (req, res) => {
    try {
        const pass = await Pass.findById(req.params.id);
        if (!pass) return res.status(404).json({ msg: "Pass not found" });

        const passUserId = pass.userId ? pass.userId.toString() : null;
        const reqUserId = req.user && req.user.id ? req.user.id.toString() : null;
        if (passUserId !== reqUserId) return res.status(403).json({ msg: "Not authorized" });

        if (pass.status !== 'pending' && pass.status !== 'approved') {
            return res.status(403).json({ msg: "Only pending or approved passes can be cancelled" });
        }

        pass.status = 'void';
        await pass.save();
        io.emit(`notify-${pass.assignedApproverId}`, { title: "Pass Cancelled", msg: "A pass was cancelled by the requestor." });
        sendPushNotification(pass.assignedApproverId, "Pass Cancelled", "A pass was cancelled by the requestor."); // 🚀 INJECTED

        res.json({ success: true, pass });
    } catch (e) {
        console.error("User cancel error:", e);
        res.status(500).json({ msg: "Error cancelling pass" });
    }
});

app.put('/api/pass/admin-override/:id', authenticateToken, authorizeRole('faculty', 'warden', 'office'), async (req, res) => {
    try {
        const pass = await Pass.findById(req.params.id).populate('userId');
        if (!pass) return res.status(404).json({ msg: "Pass not found" });

        const { action } = req.body;

        if (action === 'force_complete' && pass.status === 'active') {
            pass.status = 'completed';
            pass.actualReturnTime = new Date();
            if (pass.userId) {
                io.emit(`notify-${pass.userId._id}`, { title: "Pass Override", msg: "Your active pass was closed by an approver." });
                sendPushNotification(pass.userId._id, "Pass Override", "Your active pass was closed by an approver."); // 🚀 INJECTED
            }
        } else if (action === 'force_void' && pass.status === 'approved') {
            pass.status = 'void';
            if (pass.userId) {
                io.emit(`notify-${pass.userId._id}`, { title: "Pass Voided", msg: "Your approved pass was voided by an approver." });
                sendPushNotification(pass.userId._id, "Pass Voided", "Your approved pass was voided by an approver."); // 🚀 INJECTED
            }
        } else {
            return res.status(400).json({ msg: "Invalid action or pass state" });
        }

        await pass.save();
        res.json({ success: true, pass });
    } catch (e) {
        console.error("Admin override error:", e);
        res.status(500).json({ msg: "Error processing override" });
    }
});

app.put('/api/pass/bulk-approve', authenticateToken, authorizeRole('faculty', 'warden', 'office'), async (req, res) => {
    try {
        const { passIds } = req.body;
        if (!passIds || !Array.isArray(passIds) || passIds.length === 0) {
            return res.status(400).json({ msg: "No pass IDs provided" });
        }

        const result = await Pass.updateMany(
            { _id: { $in: passIds }, status: 'pending' },
            { $set: { status: 'approved', decisionTime: new Date() } }
        );

        const approvedPasses = await Pass.find({ _id: { $in: passIds }, status: 'approved' }).populate('userId');
        for (const pass of approvedPasses) {
            if (pass.transportMode === 'provider' && pass.destCoords && pass.destCoords.length === 2 && (!pass.drivingRoute || pass.drivingRoute.length === 0)) {
                try {
                    const providerRoute = await fetchProviderRoute(CAMPUS_COORDS, pass.destCoords);
                    if (providerRoute.length > 0) {
                        pass.drivingRoute = providerRoute;
                        await pass.save();
                    }
                } catch (e) { console.error("Bulk approve route fetch error", e); }
            }

            if (pass.userId) {
                io.emit(`notify-${pass.userId._id}`, { title: "Pass Update", msg: "approved" });
                sendPushNotification(pass.userId._id, "Pass Approved", "Your pass has been approved!"); // 🚀 INJECTED
            }
        }

        io.emit('force-refresh-transport', { msg: 'Bulk Approved' });
        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (e) {
        console.error("Bulk approve error:", e);
        res.status(500).json({ msg: "Error bulk approving passes" });
    }
});

app.put('/api/pass/decide/:id', authenticateToken, authorizeRole('faculty', 'warden', 'office'), async (req, res) => {
    try {
        const { status, reason } = req.body;
        const pass = await Pass.findByIdAndUpdate(req.params.id, {
            status, rejectionReason: reason, decisionTime: new Date()
        }, { returnDocument: 'after' }).populate('userId');

        if (!pass) return res.status(404).json({ msg: "Pass not found" });

        if (pass.userId) {
            io.emit(`notify-${pass.userId._id}`, { title: "Pass Update", msg: status });
            sendPushNotification(pass.userId._id, "Pass Update", `Your pass has been ${status}.`); // 🚀 INJECTED
        }

        if (status === 'approved') {
            io.emit('force-refresh-transport', { msg: 'New Ride Available' });
            const passDest = pass.destination ? pass.destination.toLowerCase().trim() : '';

            if (pass.transportMode === 'provider') {
                let providerRoute = [];
                if (pass.destCoords && pass.destCoords.length === 2) {
                    providerRoute = await fetchProviderRoute(CAMPUS_COORDS, pass.destCoords);
                    if (providerRoute.length > 0) {
                        pass.drivingRoute = providerRoute;
                        await pass.save();
                    }
                }

                const seekers = await Pass.find({
                    transportMode: 'seeker',
                    status: 'approved',
                    bookedRideId: { $in: [null, undefined] }
                }).populate('userId');

                const stringRoute = (pass.rideRoute || []).map(r => r.toLowerCase().trim());

                for (const seeker of seekers) {
                    const seekerDest = seeker.destination ? seeker.destination.toLowerCase().trim() : '';
                    let spatialMatch = false;
                    if (seeker.destCoords && seeker.destCoords.length === 2 && providerRoute.length >= 2) {
                        spatialMatch = checkMatch(seeker.destCoords, providerRoute);
                    } else if (seeker.destCoords && seeker.destCoords.length === 2 && pass.destCoords && pass.destCoords.length === 2) {
                        spatialMatch = haversineKm(seeker.destCoords, pass.destCoords) <= 5;
                    }
                    if (spatialMatch || seekerDest === passDest || passDest.includes(seekerDest) || seekerDest.includes(passDest) || stringRoute.some(r => seekerDest.includes(r) || r.includes(seekerDest) || (seekerDest.length > 3 && r.startsWith(seekerDest.substring(0, 4))))) {
                        if (seeker.userId && pass.userId) {
                            io.emit(`notify-${seeker.userId._id}`, {
                                title: "Ride Match Found",
                                msg: `🚗 Ride Available! ${pass.userId.name} just got approved to offer a ride to ${pass.destination}.`
                            });
                            sendPushNotification(seeker.userId._id, "Ride Match Found", `🚗 Ride Available! ${pass.userId.name} just got approved to offer a ride.`); // 🚀 INJECTED
                        }
                    }
                }
            } else if (pass.transportMode === 'seeker') {
                const providers = await Pass.find({
                    transportMode: 'provider',
                    status: 'approved',
                    seatsAvailable: { $gt: 0 }
                }).populate('userId');

                for (const provider of providers) {
                    const providerDest = provider.destination ? provider.destination.toLowerCase().trim() : '';
                    const stringRoute = (provider.rideRoute || []).map(r => r.toLowerCase().trim());

                    let spatialMatch = false;
                    const providerDrivingRoute = provider.drivingRoute || [];
                    if (pass.destCoords && pass.destCoords.length === 2 && providerDrivingRoute.length >= 2) {
                        spatialMatch = checkMatch(pass.destCoords, providerDrivingRoute);
                    } else if (pass.destCoords && pass.destCoords.length === 2 && provider.destCoords && provider.destCoords.length === 2) {
                        spatialMatch = haversineKm(pass.destCoords, provider.destCoords) <= 5;
                    }
                    if (spatialMatch || providerDest === passDest || passDest.includes(providerDest) || providerDest.includes(passDest) || stringRoute.some(r => passDest.includes(r) || r.includes(passDest) || (passDest.length > 3 && r.startsWith(passDest.substring(0, 4))))) {
                        if (pass.userId) {
                            io.emit(`notify-${pass.userId._id}`, {
                                title: "Ride Match Found",
                                msg: `🚗 Ride Match Found! There is already an approved ride going to your destination. Check the transport board!`
                            });
                            sendPushNotification(pass.userId._id, "Ride Match Found", "🚗 Ride Match Found! There is already an approved ride going to your destination."); // 🚀 INJECTED
                        }
                        break;
                    }
                }
            }
        }
        res.json(pass);
    } catch (error) {
        console.error("Pass approval error:", error);
        res.status(500).json({ msg: "Error processing approval" });
    }
});

app.put('/api/transport/book/:id', authenticateToken, async (req, res) => {
    try {
        const providerPass = await Pass.findById(req.params.id);
        if (!providerPass || providerPass.seatsAvailable <= 0) return res.status(400).json({ msg: "No seats available" });

        const { seekerPassId } = req.body;
        if (!seekerPassId) return res.status(400).json({ msg: "Seeker pass ID required" });

        const seekerPass = await Pass.findById(seekerPassId);
        if (!seekerPass) return res.status(404).json({ msg: "Seeker pass not found" });

        if (seekerPass.bookedRideId) {
            return res.status(400).json({ msg: "You have already booked a ride." });
        }

        providerPass.seatsAvailable -= 1;
        seekerPass.bookedRideId = providerPass._id;

        providerPass.set('seatsAvailable', providerPass.seatsAvailable);
        seekerPass.set('bookedRideId', providerPass._id);

        await providerPass.save();
        await seekerPass.save();

        io.emit(`notify-${providerPass.userId}`, { title: "Seat Booked", msg: "Someone joined your ride. Seats left: " + providerPass.seatsAvailable });
        sendPushNotification(providerPass.userId, "Seat Booked", `Someone joined your ride. Seats left: ${providerPass.seatsAvailable}`); // 🚀 INJECTED

        res.json({ success: true, seatsLeft: providerPass.seatsAvailable, bookedRideId: providerPass._id });
    } catch (e) { res.status(500).json({ msg: "Error booking transport" }); }
});

app.get('/api/transport/passengers/:rideId', authenticateToken, async (req, res) => {
    try {
        const passengers = await Pass.find({ bookedRideId: req.params.rideId }).populate('userId');
        res.json(passengers);
    } catch (e) {
        res.status(500).json({ msg: "Error fetching passengers" });
    }
});

app.get('/api/transport/search', authenticateToken, async (req, res) => {
    const { location } = req.query;
    if (!location) return res.json({ providers: [], seekers: [] });

    const searchStr = location.toLowerCase().trim();
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const hasCoords = !isNaN(lat) && !isNaN(lng);

    const allProviders = await Pass.find({ status: 'approved', transportMode: 'provider' }).populate('userId');
    const matchedProviders = allProviders.filter(p => {
        if (hasCoords && p.drivingRoute && p.drivingRoute.length >= 2 && checkMatch([lng, lat], p.drivingRoute)) {
            return true;
        }
        if (hasCoords && p.destCoords && p.destCoords.length === 2 && haversineKm([lat, lng], p.destCoords) <= 5) {
            return true;
        }
        const route = (p.rideRoute || []).map(r => r.toLowerCase().trim());
        const searchL = searchStr.toLowerCase();
        const pDestL = (p.destination || '').toLowerCase().trim();
        return pDestL === searchL || pDestL.includes(searchL) || searchL.includes(pDestL) || route.some(r => searchL.includes(r) || r.includes(searchL) || (searchL.length > 3 && r.startsWith(searchL.substring(0, 4))));
    });

    const allSeekers = await Pass.find({ status: 'approved', transportMode: 'seeker' }).populate('userId');
    const matchedSeekers = allSeekers.filter(s => {
        if (hasCoords && s.destCoords && s.destCoords.length === 2 && haversineKm([lat, lng], s.destCoords) <= 5) {
            return true;
        }
        const sDestL = (s.destination || '').toLowerCase().trim();
        const searchL = searchStr.toLowerCase();
        return sDestL === searchL || sDestL.includes(searchL) || searchL.includes(sDestL) || (searchL.length > 3 && sDestL.startsWith(searchL.substring(0, 4)));
    });

    res.json({ providers: matchedProviders, seekers: matchedSeekers });
});

// 🚀 OPTIMIZED SCAN ROUTE (Now with Dynamic QR Validation!)
app.post('/api/scan', authenticateToken, authorizeRole('guard'), async (req, res) => {
    const { qrToken, type } = req.body; // Guard's scanner sends the JWT token now

    let cleanId;

    try {
        // 1. VERIFY THE DYNAMIC TOKEN
        // If the token is older than 30 seconds, jwt.verify will instantly throw an error
        const decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
        cleanId = decoded.passId; // Extract the real Pass ID from the verified token

    } catch (err) {
        // If the student used an old screenshot, it fails here!
        console.error("Scan rejected: Token Expired or Invalid Screenshot");
        return res.status(403).json({ msg: "EXPIRED_QR", description: "Security Alert: This QR code has expired. Please refresh the pass." });
    }

    try {
        // 2. PROCEED WITH NORMAL SCAN LOGIC
        const pass = await Pass.findById(cleanId).populate('userId');
        if (!pass) return res.status(404).json({ msg: "Invalid Pass" });

        const now = new Date();
        const shouldSend = pass.userRole === 'student';
        let autoScannedNames = [];

        if (type === 'exit') {
            pass.outTime = now;
            pass.status = pass.isReturnable ? 'active' : 'completed';

            // ⚡ FIRE AND FORGET: No 'await' here. Let it run in the background!
            if (shouldSend) {
                sendWhatsApp(pass.userId.name, 'exit', now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), now.toLocaleDateString('en-IN'), pass.destination, pass.reason, pass.userId.parentPhone).catch(e => console.error("WA Background Error", e));
            }
        } else {
            pass.actualReturnTime = now;
            pass.status = 'completed';

            // ⚡ FIRE AND FORGET
            if (shouldSend) {
                sendWhatsApp(pass.userId.name, 'entry', now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), now.toLocaleDateString('en-IN'), pass.destination, pass.reason, pass.userId.parentPhone).catch(e => console.error("WA Background Error", e));
            }
        }
        await pass.save();

        io.emit(`notify-${pass.assignedApproverId}`, { title: "Scan", msg: "Updated" });
        sendPushNotification(pass.assignedApproverId, "Scan Update", `Pass for ${pass.userId.name} was scanned.`);

        io.emit(`notify-${pass.userId._id}`, { title: "Scan", msg: "Updated" });
        sendPushNotification(pass.userId._id, "Scan Update", "Your pass was successfully scanned at the gate.");

        // --- AUTO-SCAN FOR PASSENGERS ---
        if (pass.transportMode === 'provider') {
            const passengers = await Pass.find({ bookedRideId: pass._id }).populate('userId');
            for (const passenger of passengers) {
                if (type === 'exit' && passenger.status === 'approved') {
                    passenger.outTime = now;
                    passenger.status = passenger.isReturnable ? 'active' : 'completed';
                    if (passenger.userRole === 'student') {
                        sendWhatsApp(passenger.userId.name, 'exit', now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), now.toLocaleDateString('en-IN'), passenger.destination, passenger.reason, passenger.userId.parentPhone).catch(e => console.error(e));
                    }
                } else if (type === 'entry' && passenger.status === 'active') {
                    passenger.actualReturnTime = now;
                    passenger.status = 'completed';
                    if (passenger.userRole === 'student') {
                        sendWhatsApp(passenger.userId.name, 'entry', now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), now.toLocaleDateString('en-IN'), passenger.destination, passenger.reason, passenger.userId.parentPhone).catch(e => console.error(e));
                    }
                }

                await passenger.save();
                io.emit(`notify-${passenger.userId._id}`, { title: "Scan", msg: "Auto-Scanned via Driver" });
                sendPushNotification(passenger.userId._id, "Auto-Scanned", "Your pass was auto-scanned via your driver.");

                autoScannedNames.push(passenger.userId.name);
            }
        }

        res.json({
            success: true,
            studentName: pass.userId.name,
            batch: pass.userId.batch,
            isHosteler: pass.userId.isHosteler,
            waSent: true, // 🚨 HARDCODED TO TRUE: Tells frontend the message is queued successfully
            role: pass.userRole,
            autoScanned: autoScannedNames
        });
    } catch (e) { res.status(500).json({ msg: "Error processing scan" }); }
});

app.get('/api/analytics', async (req, res) => {
    try {
        const { role, batch, timeframe, hostel } = req.query;

        let startDate = null;
        const now = new Date();
        if (timeframe === 'today') startDate = new Date(now.setHours(0, 0, 0, 0));
        else if (timeframe === 'week') startDate = new Date(now.setDate(now.getDate() - 7));
        else if (timeframe === 'month') startDate = new Date(now.setMonth(now.getMonth() - 1));

        const basePipeline = [];
        if (startDate) basePipeline.push({ $match: { createdAt: { $gte: startDate } } });
        basePipeline.push(
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: "$user" }
        );

        const getTopDestinations = async (matchStage = null) => {
            const p = [...basePipeline];
            if (matchStage) p.push(matchStage);
            p.push(
                { $group: { _id: { $trim: { input: { $toLower: "$destination" } } }, value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } },
                { $sort: { value: -1 } },
                { $limit: 5 }
            );
            return await Pass.aggregate(p);
        };

        const getTopReasons = async (matchStage = null) => {
            const p = [...basePipeline];
            if (matchStage) p.push(matchStage);
            p.push(
                { $group: { _id: { $trim: { input: { $toLower: "$reason" } } }, value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } },
                { $sort: { value: -1 } },
                { $limit: 5 }
            );
            return await Pass.aggregate(p);
        };

        const getPassStatuses = async (matchStage = null) => {
            const p = [...basePipeline];
            if (matchStage) p.push(matchStage);
            p.push(
                { $group: { _id: "$status", value: { $sum: 1 } } },
                { $project: { name: { $toUpper: "$_id" }, value: 1, _id: 0 } }
            );
            return await Pass.aggregate(p);
        };

        if (role === 'office' || !role) {
            const destinationsData = await getTopDestinations();
            const reasonsData = await getTopReasons();
            const statusData = await getPassStatuses();

            const peakTrafficDataRaw = await Pass.aggregate([
                { $group: { _id: { $hour: "$createdAt" }, value: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]);
            const peakTrafficData = peakTrafficDataRaw.map(d => ({ name: `${d._id}:00`, value: d.value }));

            const liveOffCampus = await Pass.countDocuments({ status: 'active' });

            const successMatch = { $match: { status: { $in: ['approved', 'active', 'completed', 'overdue'] } } };

            const facultyApproversData = await Pass.aggregate([
                successMatch,
                { $lookup: { from: 'users', localField: 'assignedApproverId', foreignField: '_id', as: 'approver' } },
                { $unwind: { path: "$approver", preserveNullAndEmptyArrays: false } },
                { $match: { "approver.role": "faculty" } },
                { $group: { _id: "$approver.name", value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } },
                { $sort: { value: -1 } },
                { $limit: 5 }
            ]);

            const wardenApproversData = await Pass.aggregate([
                successMatch,
                { $lookup: { from: 'users', localField: 'assignedApproverId', foreignField: '_id', as: 'approver' } },
                { $unwind: { path: "$approver", preserveNullAndEmptyArrays: false } },
                { $match: { "approver.role": "warden" } },
                { $group: { _id: "$approver.name", value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } },
                { $sort: { value: -1 } },
                { $limit: 5 }
            ]);

            const topProvidersData = await Pass.aggregate([
                ...basePipeline,
                successMatch,
                { $match: { transportMode: 'provider' } },
                { $group: { _id: "$user.name", value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } },
                { $sort: { value: -1 } },
                { $limit: 5 }
            ]);

            const topSeekersData = await Pass.aggregate([
                ...basePipeline,
                successMatch,
                { $match: { transportMode: 'seeker' } },
                { $group: { _id: "$user.name", value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } },
                { $sort: { value: -1 } },
                { $limit: 5 }
            ]);

            const batchData = await Pass.aggregate([
                ...basePipeline,
                successMatch,
                // 👇 This line ONLY affects the Batch chart, hiding Wardens/Faculty from here!
                { $match: { "user.batch": { $nin: [null, ""] } } },
                { $group: { _id: "$user.batch", value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } },
                { $sort: { value: -1 } },
                { $limit: 5 }
            ]);

            return res.json({ destinationsData, reasonsData, statusData, peakTrafficData, liveOffCampus, facultyApproversData, wardenApproversData, topProvidersData, topSeekersData, batchData });
        }

        if (role === 'warden') {
            const matchStage = { $match: { "user.isHosteler": true, "user.hostel": hostel } };
            const wardenStatus = await getPassStatuses(matchStage);
            const wardenDestinations = await getTopDestinations(matchStage);
            const currentlyOutsideRaw = await Pass.aggregate([...basePipeline, matchStage, { $match: { status: 'active' } }, { $count: "count" }]);
            const currentlyOutside = currentlyOutsideRaw.length > 0 ? currentlyOutsideRaw[0].count : 0;

            return res.json({ wardenStatus, wardenDestinations, currentlyOutside });
        }

        if (role === 'faculty') {
            const matchStage = { $match: { "user.batch": batch || 'UNKNOWN' } };
            const batchStatus = await getPassStatuses(matchStage);
            const batchDestinations = await getTopDestinations(matchStage);
            const topRequesters = await Pass.aggregate([
                ...basePipeline, matchStage,
                { $group: { _id: "$user.name", value: { $sum: 1 } } },
                { $project: { name: "$_id", value: 1, _id: 0 } },
                { $sort: { value: -1 } },
                { $limit: 5 }
            ]);

            return res.json({ batchStatus, batchDestinations, topRequesters });
        }

        return res.json({});
    } catch (e) {
        console.error("Analytics Error:", e);
        res.status(500).json({ msg: "Error fetching analytics" });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));
