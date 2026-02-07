require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/User');
const Pass = require('./models/Pass');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

mongoose.connect('mongodb://127.0.0.1:27017/flux_real_db')
  .then(() => console.log("✅ FLUX Database Connected"));

// --- STATIC DATA: AUTO DRIVERS ---
const AUTO_DRIVERS = [
  { name: "Raju (Angamaly Stand)", phone: "9998887771", loc: "Angamaly" },
  { name: "Suresh (Mookannoor)", phone: "9998887772", loc: "Mookannoor" }
];

// --- HELPER: ROUTE MATCHING ---
// Simulates checking if a seeker's location is on the provider's way
const isLocationOnRoute = (providerDest, seekerDest) => {
  const p = providerDest.toLowerCase();
  const s = seekerDest.toLowerCase();
  
  // Simple logic: If destinations match OR if provider goes to a major hub (Ernakulam) passing through local (Aluva)
  if (p === s) return true;
  if (p === 'ernakulam' && (s === 'aluva' || s === 'kalamassery')) return true;
  if (p === 'angamaly' && s === 'mookannoor') return true;
  
  return false;
};

// --- NOTIFICATIONS ---
const notify = (userId, msg) => {
  io.emit(`notify-${userId}`, { msg });
};
const notifySMS = (phone, msg) => {
  console.log(`[SMS] To ${phone}: ${msg}`);
};

// --- ROUTES ---

// 1. LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if(user) res.json(user);
  else res.status(401).json({msg: "User not found or Wrong Password"});
});

// 2. GET ADVISORS (Returns Multiple for Selection)
app.get('/api/advisors/:batch', async (req, res) => {
  const advisors = await User.find({ role: 'faculty', advisorBatch: req.params.batch });
  res.json(advisors);
});

// 3. CREATE PASS (INTELLIGENT ROUTING)
app.post('/api/pass/create', async (req, res) => {
  try {
    const { userId, reason, destination, transportMode, isReturnable, requestedTime, vehicleType, seatsAvailable, assignedApproverId } = req.body;
    const user = await User.findById(userId);
    
    // A. LOGIC: RETURN TIME / HALF DAY
    let returnTime = null;
    let status = 'pending';
    
    if (user.role === 'faculty' && !isReturnable) {
       // Logic: If Faculty/Staff NOT returning, it's a Half Day Leave
       // Note: We don't mark it 'rejected', just note it in DB.
    }

    if (reason === 'Lunch') {
       returnTime = new Date(Date.now() + 60 * 60 * 1000); // 1 Hour
    } else if (isReturnable && requestedTime) {
       returnTime = new Date(requestedTime);
    }

    // B. ROUTING LOGIC (The Core Requirement)
    let approver = null;
    const currentHour = new Date().getHours();
    // College Hours: 9 AM to 4 PM (16:00)
    const isCollegeHours = currentHour >= 9 && currentHour < 16; 

    if (user.role === 'student') {
        if (isCollegeHours) {
            // RULE: During hours -> Advisor (Hosteler OR Day Scholar)
            approver = assignedApproverId; // Student selected from dropdown
        } else {
            // RULE: After hours
            if (user.isHosteler) {
                // Hosteler -> Warden
                const warden = await User.findOne({ role: 'warden' });
                if(warden) approver = warden._id;
            } else {
                // Day Scholar -> Advisor
                approver = assignedApproverId;
            }
        }
    } else {
        // Faculty / Staff / Warden -> Admin Office
        const office = await User.findOne({ role: 'office' });
        if(office) approver = office._id;
    }

    const pass = new Pass({
      userId, userRole: user.role, reason, destination,
      isReturnable, expectedReturnTime: returnTime,
      assignedApproverId: approver,
      transportMode, vehicleType, seatsAvailable,
      status // defaults to pending
    });

    await pass.save();
    if(approver) notify(approver, `New Request from ${user.name}`);
    res.json(pass);
  } catch(e) { res.status(500).json(e); }
});

// 4. FETCH HISTORY (Includes Approver History)
app.get('/api/pass/my-history/:id', async (req, res) => {
  const passes = await Pass.find({ userId: req.params.id }).sort({createdAt: -1});
  res.json(passes);
});

// 5. FETCH PENDING & APPROVED HISTORY (For Approvers)
app.get('/api/pass/approver-data/:approverId', async (req, res) => {
  const pending = await Pass.find({ assignedApproverId: req.params.approverId, status: 'pending' }).populate('userId');
  const history = await Pass.find({ assignedApproverId: req.params.approverId, status: { $ne: 'pending' } }).sort({updatedAt: -1}).populate('userId');
  res.json({ pending, history });
});

// 6. DECIDE (APPROVE/REJECT)
app.put('/api/pass/decide/:id', async (req, res) => {
  const { status, reason } = req.body;
  const pass = await Pass.findByIdAndUpdate(req.params.id, { status, rejectionReason: reason }, { new: true }).populate('userId');
  notify(pass.userId._id, `Pass ${status.toUpperCase()}`);
  res.json(pass);
});

// 7. TRANSPORT MATCHING (Route Detection)
app.get('/api/transport/search', async (req, res) => {
  const { location } = req.query; 
  
  // Find all approved providers
  const allProviders = await Pass.find({
    status: 'approved',
    transportMode: 'provider',
    seatsAvailable: { $gt: 0 }
  }).populate('userId', 'name parentPhone vehicle');

  // Filter in JS for "Route Matching" logic
  const matches = allProviders.filter(p => isLocationOnRoute(p.destination, location));

  res.json({ matches, autos: AUTO_DRIVERS });
});

// 8. SCAN
app.post('/api/scan', async (req, res) => {
  const { passId, type } = req.body;
  const now = new Date();
  const pass = await Pass.findById(passId).populate('userId');

  if (type === 'exit') {
    pass.outTime = now;
    // IF NOT RETURNABLE -> MARK "HALF DAY LEAVE" / COMPLETED
    if (!pass.isReturnable) {
       pass.status = (pass.userRole === 'faculty' || pass.userRole === 'non-teaching') ? 'Half Day Leave' : 'Completed';
    } else {
       pass.status = 'Active';
    }
    
    if(pass.userId.parentPhone) notifySMS(pass.userId.parentPhone, `${pass.userId.name} EXITED.`);
    if(pass.assignedApproverId) notify(pass.assignedApproverId, `${pass.userId.name} EXITED.`);
  } 
  else if (type === 'entry') {
    if (!pass.isReturnable) return res.status(400).json({msg: "Pass Expired on Exit"});
    pass.actualReturnTime = now;
    pass.status = 'Completed';

    if (pass.expectedReturnTime && new Date(pass.expectedReturnTime) < now) {
       const lateMsg = `ALERT: ${pass.userId.name} returned LATE.`;
       notifySMS(pass.userId.parentPhone, lateMsg);
       if(pass.assignedApproverId) notify(pass.assignedApproverId, lateMsg);
    } else {
       notifySMS(pass.userId.parentPhone, `${pass.userId.name} Returned Safely.`);
    }
  }
  await pass.save();
  res.json({ success: true, student: pass.userId.name, status: pass.status });
});

server.listen(5000, () => console.log("🚀 Server running on 5000"));