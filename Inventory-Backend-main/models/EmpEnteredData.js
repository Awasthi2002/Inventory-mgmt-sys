const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmpEnteredDataSchema = new Schema({
  offerId: {
    type: Schema.Types.ObjectId,
    ref: 'Offer',
    required: true
  },
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
    trackingLink: {
    type: String,
    required: false,
    trim: true,
    default: '',

  },
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        if (!email) return true; // Allow empty/null values
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  phone: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(phone) {
        if (!phone) return true; // Allow empty/null values
        return /^[\+]?[1-9][\d]{0,15}$/.test(phone);
      },
      message: 'Please enter a valid phone number'
    }
  },
  password: {
    type: String,
    required: false
  },
  amount: {
    type: Number,
    required: false,
    min: 0
  },
  paymentOption: {
    type: Schema.Types.ObjectId,
    ref: 'Payment',
    default: null,
    validate: {
      validator: function(v) {
        // Allow null/undefined values
        if (v === null || v === undefined) return true;
        
        // Validate ObjectId format
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Payment option must be a valid Payment reference or null'
    }
  },
    screenshot: {
    type: String,
    required: false,
    trim: true,
    default: null,
    validate: {
      validator: function(url) {
        if (!url) return true; // Allow empty/null values
        // Basic URL validation for screenshot paths
        return /^(https?:\/\/|\/|\.\/|\.\.\/).*\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
      },
      message: 'Screenshot must be a valid image URL or file path'
    }
  },
  comment: {
    type: String,
    required: false,
    trim: true,
    default: null 
  },
  paymentStatus: {
    type: String,
    required: false,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  status: {
    type: String,
    required: false,
    enum: ['active', 'inactive', 'pending', 'approved', 'rejected', 'suspended','completed'],
    default: 'pending'
  },

}, {
  timestamps: true, // Adds createdAt and updatedAt fields automatically
  versionKey: false
});

// Indexes for better query performance
EmpEnteredDataSchema.index({ offerId: 1 });
EmpEnteredDataSchema.index({ employeeId: 1 });
EmpEnteredDataSchema.index({ email: 1 });
EmpEnteredDataSchema.index({ paymentStatus: 1 });
EmpEnteredDataSchema.index({ status: 1 });
EmpEnteredDataSchema.index({ trackingLink: 1 }); // New index for tracking link

// Compound index for common queries
EmpEnteredDataSchema.index({ employeeId: 1, offerId: 1 });



const EmpEnteredData = mongoose.model('EmpEnteredData', EmpEnteredDataSchema);

module.exports = EmpEnteredData;