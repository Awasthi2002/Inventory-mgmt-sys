const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  reviewEnabled: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Platform = mongoose.model('Platform', platformSchema);

module.exports =Platform;

