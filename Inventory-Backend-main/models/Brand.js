const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the embedded product schema
const productSchema = new Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    default: new mongoose.Types.ObjectId(),
    required: true
  },
  name: {
    type: String,
    required: true
  },
  productUrl: {  // Added product URL field
    type: String,
    default: ''
  },
  unit: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  noExpiry: {
    type: Boolean,
    default: false
  },
  expiry_date: {
    type: Date,
    default: null
  }
});

const brandSchema = new Schema({
  brandName: {
    type: String,
    required: true
  },
  clientId: {  // Added client ID field
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  products: [productSchema], // Embedded products array using the productSchema
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;