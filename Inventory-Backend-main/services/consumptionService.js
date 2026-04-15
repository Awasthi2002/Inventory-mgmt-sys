const ProductDelivered = require('../models/productDelivered');
const ProductConsumed = require('../models/productConsumed');

class ConsumptionService {
  static async recordConsumption(consumptionData) {
    const deliveredProduct = await ProductDelivered.findById(
      consumptionData.orderId
    );

    if (!deliveredProduct) {
      throw new Error('No delivered product found for this order ID');
    }

    // Validate and update remaining quantities
    for (const consumedItem of consumptionData.products) {
      const deliveredItem = deliveredProduct.products.find(
        p => p.product.toString() === consumedItem.product.toString()
      );

      if (!deliveredItem) {
        throw new Error('Product not found in delivery');
      }

      if (deliveredItem.remainingQuantity < consumedItem.consumedQuantity) {
        throw new Error(
          `Insufficient quantity available. Remaining: ${deliveredItem.remainingQuantity}`
        );
      }

      deliveredItem.remainingQuantity -= consumedItem.consumedQuantity;
    }

    await deliveredProduct.save();
    return await ProductConsumed.create(consumptionData);
  }

  static async getConsumptionReport(filters = {}) {
    const query = {};
    
    if (filters.brandName) {
      query.brandName = filters.brandName;
    }
    
    if (filters.startDate && filters.endDate) {
      query.consumptionDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    return await ProductConsumed.find(query)
      .populate('orderId')
      .sort({ consumptionDate: -1 });
  }
}

module.exports = ConsumptionService;