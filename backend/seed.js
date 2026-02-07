const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/flux_real_db').then(async () => {
  await User.deleteMany({});
  
  await User.insertMany([
    // STUDENTS
    { username: 'hosteler', password: '123', name: 'Arjun (Hostel)', role: 'student', batch: 'S6-CS', isHosteler: true, parentPhone: '8547994163' },
    { username: 'day', password: '123', name: 'Neha (Day)', role: 'student', batch: 'S6-CS', isHosteler: false, parentPhone: '9188301994' },
    
    // FACULTY
    { username: 'advisor1', password: '123', name: 'Prof. John', role: 'faculty', advisorBatch: 'S6-CS', department: 'CS' },
    { username: 'advisor2', password: '123', name: 'Prof. Mary', role: 'faculty', advisorBatch: 'S6-CS', department: 'CS' },
    { username: 'faculty', password: '123', name: 'Dr. Smith', role: 'faculty', department: 'EC' },

    // STAFF
    { username: 'staff', password: '123', name: 'Ramesh (Lab)', role: 'non-teaching' },

    // WARDEN & OFFICE & GUARD
    { username: 'warden', password: '123', name: 'Hostel Warden', role: 'warden' },
    { username: 'office', password: '123', name: 'Admin Office', role: 'office' },
    { username: 'guard', password: '123', name: 'Main Gate', role: 'guard' },
  ]);
  
  console.log("✅ Database Seeded");
  process.exit();
});