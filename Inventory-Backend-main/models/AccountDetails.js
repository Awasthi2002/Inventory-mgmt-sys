const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Payment Schema
const paymentSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  paymentType: {
    type: String,
    enum: ['card', 'upi'],
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[\d\(\)\-\+\s]{10,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  
  // Card-specific fields
  cardDetails: {
    cardNumber: {
      type: String,
      validate: {
        validator: function(v) {
          // Only validate if payment type is card
          if (this.paymentType !== 'card') return true;
          
          // Remove spaces for validation
          const digitsOnly = v.replace(/\s/g, '');
          
          // Accept card numbers with 13, 14, 15, 16, or 19 digits
          return /^\d{13}$|^\d{14}$|^\d{15}$|^\d{16}$|^\d{19}$/.test(digitsOnly);
        },
        message: props => 'Card number must be 13, 14, 15, 16, or 19 digits!'
      }
    },
    cardType: {
      type: String,
      enum: ['HDFC', 'ICICI Bank Mx', 'ICICI Bank', 'Induslnd Bank', 'Axis', 'Tide', 'Visa', 'Mastercard', 'American Express', 'Discover', 'RuPay', 'Other']
    },
    expirationDate: {
      type: String,
      validate: {
        validator: function(v) {
          return this.paymentType === 'card' ? /^(0[1-9]|1[0-2])\/\d{2}$/.test(v) : true;
        },
        message: props => 'Please use MM/YY format for expiration date!'
      }
    },
    cvv: {
      type: String,
      validate: {
        validator: function(v) {
          return this.paymentType === 'card' ? /^\d{3,4}$/.test(v) : true;
        },
        message: props => 'CVV must be 3-4 digits!'
      }
    }
  },
  
  // UPI-specific fields
  upiDetails: {
    upiId: {
      type: String,
      validate: {
        validator: function(v) {
          return this.paymentType === 'upi' ? v.includes('@') : true;
        },
        message: props => 'UPI ID must include @ symbol!'
      }
    },
    bankName: String,
    accountNumber: String,
    ifscCode: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create the model
const Payment = mongoose.model('Payment', paymentSchema);

module.exports =Payment;