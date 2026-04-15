const OrderService = require('../services/orderService');
const asyncHandler = require('../middleware/asyncHandler');

exports.createOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.createOrder(req.body);
  res.status(201).json({ success: true, data: order });
});const OrderService = require('../services/orderService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Create a new order
 * @route POST /orders
 * @access Public
 */
exports.createOrder = asyncHandler(async (req, res) => {
  try {
    const order = await OrderService.createOrder(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Update the status of an order
 * @route PATCH /orders/:orderId
 * @access Public
 */
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    const order = await OrderService.updateOrderStatus(
      req.params.orderId,
      req.body.status
    );
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * Get all orders
 * @route GET /orders
 * @access Public
 */


/**
 * Create a new order
 * @route POST /orders
 * @access Public
 */
exports.createOrder = asyncHandler(async (req, res) => {
  try {
    const order = await OrderService.createOrder(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Update the status of an order
 * @route PATCH /orders/:orderId
 * @access Public
 */
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    const order = await OrderService.updateOrderStatus(
      req.params.orderId,
      req.body.status
    );
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * Get all orders
 * @route GET /orders
 * @access Public
 */
exports.getOrders = asyncHandler(async (req, res) => {
  try {
    const orders = await OrderService.getOrders(req.query);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await OrderService.updateOrderStatus(
    req.params.orderId,
    req.body.status
  );
  res.json({ success: true, data: order });
});

exports.getOrders = asyncHandler(async (req, res) => {
  const orders = await OrderService.getOrders(req.query);
  res.json({ success: true, data: orders });
});

