const ProductOrder = require('../models/productOrder');
const ProductDelivered = require('../models/productDelivered');
const { generateOrderId } = require('../utils/orderIdGenerator');

class OrderService {
  static async createOrder(orderData) {
    orderData.orderId = await generateOrderId();
    const order = await ProductOrder.create(orderData);
    return order;
  }

  static async updateOrderStatus(orderId, status) {
    const order = await ProductOrder.findOneAndUpdate(
      { orderId },
      { deliveryStatus: status },
      { new: true }
    );

    if (status === 'delivered') {
      await this.createDeliveryRecord(order);
    }

    return order;
  }

  static async createDeliveryRecord(order) {
    return await ProductDelivered.create({
      orderId: order._id,
      brandName: order.brandName,
      products: order.products.map(p => ({
        product: p.product,
        quantity: p.quantity,
        remainingQuantity: p.quantity
      })),
      employee: order.employee
    });
  }

  static async getOrders(filters = {}) {
    const query = {};
    
    if (filters.brandName) {
      query.brandName = filters.brandName;
    }
    
    if (filters.status) {
      query.deliveryStatus = filters.status;
    }

    return await ProductOrder.find(query)
      .populate('employee', 'name email')
      .sort({ orderDate: -1 });
  }
}

module.exports = OrderService;