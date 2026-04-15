const mongoose = require('mongoose');

// DailyAssignWork Schema (stores offer details and total entry count)
const DailyAssignWorkSchema = new mongoose.Schema({
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
  },
  totalEntryCount: {
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
DailyAssignWorkSchema.index({ offerId: 1 });

const DailyAssignWork = mongoose.model('DailyAssignWork', DailyAssignWorkSchema);

module.exports = DailyAssignWork;