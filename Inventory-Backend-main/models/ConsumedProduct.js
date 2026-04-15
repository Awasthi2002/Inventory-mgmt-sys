const mongoose = require('mongoose');

const consumedProductSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  productDetails: [{
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true
    },
    products: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      consumedQuantity: {
        type: Number,
        required: true,
        min: 0
      }
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the timestamps on save
consumedProductSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ConsumedProduct = mongoose.model('ConsumedProduct', consumedProductSchema);

module.exports = ConsumedProduct;