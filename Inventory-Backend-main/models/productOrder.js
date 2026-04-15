const mongoose = require('mongoose');

const productOrderSchema = new mongoose.Schema({
  brandName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    remaining_quantity: {
      type: Number,
    },
    deliveryStatus: {
      type: String,
      enum: ['Ordered', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Ordered'
    }
  }],
  accountNo:{
    type:String,
    default:null,
  },
  password:{
    type:String,
    default:null
  },
  employeeName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: [true, 'Order ID is required'],
    unique: true,
    trim: true
  },
  orderAmount: {
    type: Number,
    required: [true, 'Order amount is required'],
    min: [0, 'Order amount cannot be negative']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  finalAmount: {
    type: Number,
    required: [true, 'Final amount is required'],
    min: [0, 'Final amount cannot be negative']
  },
  fullAddress: {
    type: String,
    required: [true, 'Full address is required'],
    trim: true
  },
  phoneNo: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  deliveryPhoneNo: {
    type: String,
    required: [true, 'Delivery phone number is required'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'cod'],
    required: [true, 'Payment method is required']
  },
  accountDetails: {
    type: String,
    default: null,
    trim: true
  },
  selectedAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },
  note: {
    type: String,
    trim: true
  },
  platformName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    default: null
  },
  screenshot: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to set remaining_quantity equal to quantity
productOrderSchema.pre('save', function(next) {
  // For each product in the products array
  this.products.forEach(product => {
    // If remaining_quantity is not set, set it equal to quantity
    if (product.remaining_quantity === undefined) {
      product.remaining_quantity = product.quantity;
    }
  });
  next();
});

const ProductOrder = mongoose.model('ProductOrder', productOrderSchema);
module.exports = ProductOrder;