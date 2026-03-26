const mongoose = require('mongoose');
const PassSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userRole: String, reason: String, destination: String,
    isReturnable: Boolean, expectedReturnTime: Date, actualReturnTime: Date, outTime: Date,
    assignedApproverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: 'pending' }, rejectionReason: String,
    transportMode: { type: String, default: 'none' }, // seeker, provider
    rideRoute: [String], seatsAvailable: Number, destCoords: [Number],
    drivingRoute: { type: [[Number]], default: undefined },
    bookedRideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pass' } // <-- FIX: Added so Mongoose saves it
}, { timestamps: true });
module.exports = mongoose.model('Pass', PassSchema);