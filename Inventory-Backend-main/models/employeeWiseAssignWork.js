const mongoose = require('mongoose');

// EmployeeWiseAssignWork Schema (stores distributed entry counts per employee)
const EmployeeWiseAssignWorkSchema = new mongoose.Schema({
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  entryCount: {
    type: Number,
    required: true,
    min: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create index for faster queries
EmployeeWiseAssignWorkSchema.index({ offerId: 1, employeeId: 1 }, { unique: true });

const EmployeeWiseAssignWork = mongoose.model('EmployeeWiseAssignWork', EmployeeWiseAssignWorkSchema);

module.exports = EmployeeWiseAssignWork;