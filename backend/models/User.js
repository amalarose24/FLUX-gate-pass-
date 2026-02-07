const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  
  role: { 
    type: String, 
    enum: ['student', 'faculty', 'non-teaching', 'warden', 'guard', 'office'], 
    required: true 
  },

  // Student
  batch: String, 
  isHosteler: { type: Boolean, default: false },
  parentPhone: String,
  
  // Faculty/Advisor
  advisorBatch: { type: String, default: null }, 
  department: String,

  // Transport
  vehicle: {
    hasVehicle: { type: Boolean, default: false },
    type: { type: String, enum: ['Car', 'Bike', 'None'], default: 'None' },
    seats: { type: Number, default: 0 }
  }
});

module.exports = mongoose.model('User', UserSchema);