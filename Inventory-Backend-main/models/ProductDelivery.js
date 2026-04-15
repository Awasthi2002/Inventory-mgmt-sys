const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productDeliverySchema = new Schema({
  orderId: {
    type: String,
    required: true
  },
  brandId: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platformName: {  // Updated to reference Platform model
    type: Schema.Types.ObjectId,
    ref: 'Platform',
    required: false,  // Set to false as it's optional
  },
  reviewScreenshot: {  // Added review screenshot field
    type: String,      // Stores the path or URL to the screenshot
    required: false,
    default: null
  },
   reviewLink: {  // Added review link field
    type: String,
    required: false,
    default: null
  },
    reviewDate: {
    type: Date,
    required: false,
    default: null
  },
    accountNo: {
    type: String,
    required: false,
    default: null
  },
  password: {
    type: String,
    required: false,
    default: null
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  products: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    deliveryStatus: {
      type: String,
      enum: ['delivered', 'pending', 'failed'],
      default: 'delivered'
    },
    consumptionStatus: {
      type: String,
      default: '0_consumed'
    }

  }]
}, {
  timestamps: true
});

const ProductDelivered = mongoose.model('ProductDelivery', productDeliverySchema);

module.exports = ProductDelivered;