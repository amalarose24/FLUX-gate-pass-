const mongoose = require('mongoose');
const User = require('./models/User');
const Pass = require('./models/Pass');

mongoose.connect('mongodb://127.0.0.1:27017/flux_real_db').then(async () => {
  await User.deleteMany({});
  await Pass.deleteMany({});

  await User.create([
    // Students
    { name: 'Amala', username: 'amala', password: '123', role: 'student', batch: 'S6-CSD', parentPhone: '9188301994', isHosteler: false },
    { name: 'Rose', username: 'rose', password: '123', role: 'student', batch: 'S6-CSD', parentPhone: '8547994163', isHosteler: true, hostel: 'Girls' },
    { name: 'Nisha', username: 'nisha', password: '123', role: 'student', batch: 'S6-CSD', parentPhone: '8714499186', isHosteler: false },
    { name: 'Ashwin', username: 'ashwin', password: '123', role: 'student', batch: 'S6-CSD', parentPhone: '8111829815', isHosteler: true, hostel: 'Boys' },
    { name: 'Nirmal', username: 'nirmal', password: '123', role: 'student', batch: 'S3-EC', parentPhone: '9447704007', isHosteler: false },
    { name: 'Paul', username: 'paul', password: '123', role: 'student', batch: 'S3-EC', parentPhone: '9497485811', isHosteler: true, hostel: 'Boys' },
    { name: 'Harikrishnan', username: 'hari', password: '123', role: 'student', batch: 'S3-EC', parentPhone: '9539272224', isHosteler: false },
    // Faculty Advisors
    { name: 'Prof. Merin', username: 'merin', password: '123', role: 'faculty', advisorBatch: 'S6-CSD' },
    { name: 'Prof. Ancy', username: 'ancy', password: '123', role: 'faculty', advisorBatch: 'S6-CSD' },
    { name: 'Prof. Alex', username: 'alex', password: '123', role: 'faculty', advisorBatch: 'S3-EC' },
    { name: 'Prof. Sarah', username: 'sarah', password: '123', role: 'faculty', advisorBatch: 'S3-EC' },

    //normal staff
    { name: 'Mr. Thomas', username: 'thomas', password: '123', role: 'faculty', advisorBatch: 'null' },
    
    // Wardens
    { name: 'Hostel Warden (Boys 1)', username: 'boywarden1', password: '123', role: 'warden', hostel: 'Boys' },
    { name: 'Hostel Warden (Boys 2)', username: 'boywarden2', password: '123', role: 'warden', hostel: 'Boys' },
    { name: 'Hostel Warden (Girls 1)', username: 'girlwarden1', password: '123', role: 'warden', hostel: 'Girls' },
    { name: 'Hostel Warden (Girls 2)', username: 'girlwarden2', password: '123', role: 'warden', hostel: 'Girls' },

    // Staff
    { name: 'Admin Office', username: 'office', password: '123', role: 'office' },
    { name: 'Ms.Smija', username: 'staff', password: '123', role: 'non-teaching' },

    // Guard
    { username: 'guard', password: '123', name: 'Main Gate', role: 'guard' }
  ]);

  console.log("Database Users Reset & Seeded Successfully");
  process.exit();
}).catch(err => {
  console.error("Seeding Error:", err);
  process.exit(1);
});