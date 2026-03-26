const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: String, password: String, name: String,
  role: { type: String, enum: ['student', 'faculty', 'non-teaching', 'warden', 'office', 'guard'] },
  batch: String, isHosteler: Boolean, parentPhone: String, whatsapp: String,
  hostel: { type: String, enum: ['Boys', 'Girls', null], default: null },
  advisorBatch: String, department: String,
  vehicle: { type: String, default: 'None' } // Car, Bike, None
});
module.exports = mongoose.model('User', UserSchema);