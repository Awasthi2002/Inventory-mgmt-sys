const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const offerSchema = new Schema({
  clientId: {
    type: Schema.Types.ObjectId,  // Changed from String to ObjectId
    ref: 'User',  // Reference to User model
    required: true
  },
  offerName: {
    type: String,
    required: true,
    trim: true,
    minlength: 1
  },
  previewLink: {
    type: String,
    required: true,
    match: /^https?:\/\/[^\s$.?#].[^\s]*$/ // Validates URI format
  },
  trackingLinks: {
    type: [{
      link: {
        type: String,
        required: true,
        match: /^https?:\/\/[^\s$.?#].[^\s]*$/ // Validates URI format
      },
      margin: {
        type: String,
        required: true,
        match: /^[0-9]+$/ // Ensures margin is a string of digits
      }
    }],
    required: true,
    validate: {
      validator: function(array) {
        return array.length > 0;
      },
      message: 'trackingLinks array must contain at least one item'
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports =Offer;
