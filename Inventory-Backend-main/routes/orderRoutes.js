const express = require('express');
const router = express.Router();
const {
  createOrder,
  updateOrderStatus,
  getOrders
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .post(protect, authorize('admin', 'employee'), createOrder)
  .get(protect, getOrders);

router
  .route('/:orderId/status')
  .put(protect, authorize('admin', 'employee'), updateOrderStatus);

module.exports = router;