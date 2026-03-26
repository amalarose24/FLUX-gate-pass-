require('dotenv').config();
const mongoose = require('mongoose');
// Make sure to install bcryptjs if you haven't: npm install bcryptjs
const bcrypt = require('bcryptjs'); 

// Import your models (adjust the path if your models are in a different folder)
const User = require('./models/User');
const Pass = require('./models/Pass');

// Dummy Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/flux_real_db')
    .then(() => console.log("✅ Connected to MongoDB for Dummy Seeding"))
    .catch(err => console.log("❌ DB Connection Error:", err));

const seedDatabase = async () => {
    try {
        console.log("🧹 Clearing old database data...");
        await User.deleteMany({});
        await Pass.deleteMany({});

        console.log("🔐 Generating hashed passwords...");
        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash("password123", salt);

        console.log("👥 Creating Dummy Users...");

        // 1. Office Admin
        const admin = new User({
            name: "College Admin",
            username: "admin_office",
            password: defaultPassword,
            role: "office",
            parentPhone: "0000000000"
        });

        // 2. Security Guard
        const guard = new User({
            name: "Main Gate Guard",
            username: "guard_01",
            password: defaultPassword,
            role: "guard",
            parentPhone: "0000000000"
        });

        // 3. Hostel Warden
        const warden = new User({
            name: "Warden Smith",
            username: "warden_mens",
            password: defaultPassword,
            role: "warden",
            hostel: "Mens Hostel A",
            parentPhone: "0000000000"
        });

        // 4. Faculty Advisor
        const advisor = new User({
            name: "Prof. Alan Turing",
            username: "faculty_alan",
            password: defaultPassword,
            role: "faculty",
            advisorBatch: "CS2023",
            department: "Computer Science",
            parentPhone: "0000000000"
        });

        // 5. Ride Provider (Faculty/Student offering a ride)
        const provider = new User({
            name: "Dr. Jane Doe",
            username: "provider_jane",
            password: defaultPassword,
            role: "faculty",
            vehicle: "KL-07-AB-1234",
            parentPhone: "9999999991"
        });

        // 6. Student (Hosteller)
        const student1 = new User({
            name: "Student Alpha",
            username: "student_alpha",
            password: defaultPassword,
            role: "student",
            batch: "CS2023",
            isHosteler: true,
            hostel: "Mens Hostel A",
            parentPhone: "9999999999" // FAKE NUMBER
        });

        // 7. Student (Day Scholar)
        const student2 = new User({
            name: "Student Beta",
            username: "student_beta",
            password: defaultPassword,
            role: "student",
            batch: "CS2023",
            isHosteler: false,
            parentPhone: "8888888888" // FAKE NUMBER
        });

        // Save all users to database
        await admin.save();
        await guard.save();
        await warden.save();
        await advisor.save();
        await provider.save();
        await student1.save();
        await student2.save();

        console.log("🎟️ Creating Dummy Gate Passes...");

        // Pass 1: An approved ride offering to Aluva
        const providerPass = new Pass({
            userId: provider._id,
            userRole: provider.role,
            reason: "Heading Home",
            destination: "Aluva Railway Station",
            isReturnable: true,
            status: "approved",
            transportMode: "provider",
            seatsAvailable: 3,
            rideRoute: ["Mookkannoor", "Angamaly", "Aluva"],
            destCoords: [76.3534, 10.1076], // Real Aluva Coordinates for Turf.js testing
            assignedApproverId: admin._id
        });

        // Pass 2: A pending pass from a student waiting for the advisor
        const pendingPass = new Pass({
            userId: student1._id,
            userRole: student1.role,
            reason: "Medical Emergency",
            destination: "Angamaly Hospital",
            isReturnable: true,
            status: "pending",
            transportMode: "none",
            assignedApproverId: advisor._id
        });

        // Pass 3: A completed pass to show in the history/analytics dashboard
        const completedPass = new Pass({
            userId: student2._id,
            userRole: student2.role,
            reason: "Weekend Purchase",
            destination: "Ernakulam City",
            isReturnable: true,
            status: "completed",
            transportMode: "public",
            assignedApproverId: advisor._id,
            outTime: new Date(Date.now() - 5 * 60 * 60 * 1000), // Left 5 hours ago
            actualReturnTime: new Date(Date.now() - 1 * 60 * 60 * 1000) // Returned 1 hour ago
        });

        await providerPass.save();
        await pendingPass.save();
        await completedPass.save();

        console.log("✅ Dummy Database Seeded Successfully!");
        console.log("🔑 ALL PASSWORDS ARE SET TO: password123");
        process.exit(); // Stop the script

    } catch (error) {
        console.error("❌ Seeding Error:", error);
        process.exit(1);
    }
};

seedDatabase();