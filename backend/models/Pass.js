const mongoose = require('mongoose');

const PassSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userRole: String,
  
  reason: String,
  destination: String,
  
  // TIME
  isReturnable: { type: Boolean, default: false },
  expectedReturnTime: Date,
  actualReturnTime: Date,
  outTime: Date,
  
  // APPROVAL
  assignedApproverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  status: { type: String, default: 'pending' }, 
  rejectionReason: String, 
  
  // TRANSPORT
  transportMode: { type: String, enum: ['seeker', 'provider', 'none'], default: 'none' },
  vehicleType: String,
  seatsAvailable: Number,
  rideRoute: [String], // ["Mookannoor", "Angamaly"]
  
  // NOTIFICATIONS
  notifiedExit: { type: Boolean, default: false },
  notifiedEntry: { type: Boolean, default: false },
  notifiedLate: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Pass', PassSchema);