const Brand = require('../models/Brand');
const User = require('../models/User');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const path = require('path');
const upload = require('../config/multer');
const ProductOrder = require('../models/productOrder');
const ProductDelivery = require('../models/ProductDelivery');
const ConsumedProduct = require('../models/ConsumedProduct');



const UpdateDeliveredProduct = async (req, res) => {
  try {
    console.log('==================== UPDATE DELIVERED PRODUCT - START ====================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Received request to update delivery:', req.params.id);
    console.log('File upload data:', req.file || 'No file uploaded');
    console.log('whole req', req.body);
    
    const { id } = req.params;
    const {
      orderId,
      employeeId,
      deliveryDate,
      reviewLink,
      platform,
      accountNo,  // Added accountNo field
      password,   // Added password field
      reviewDate  // Added reviewDate field
    } = req.body;
    
    // Parse products data if it's a string
    const products = typeof req.body.products === 'string' 
      ? JSON.parse(req.body.products) 
      : req.body.products;
    
    console.log('Parsed products data:', products);
    console.log('Review link received:', reviewLink || 'No review link provided');
    console.log('Platform data:', platform ? (typeof platform === 'string' ? JSON.parse(platform) : platform) : 'No platform data');
    console.log('Account No received:', accountNo || 'No account number provided');
    console.log('Password received:', password ? '********' : 'No password provided');
    console.log('Review Date received:', reviewDate || 'No review date provided');

    // Prepare platform data
    const platformData = typeof platform === 'string' ? JSON.parse(platform) : platform;
    

        // Convert platform ID to MongoDB ObjectId
    let platformObjectId;
    if (platformData && platformData._id) {
      try {
        platformObjectId = new mongoose.Types.ObjectId(platformData._id);
      } catch (err) {
        console.error('Error converting platform ID to ObjectId:', err);
        platformObjectId = null;
      }
    }
    
    console.log('Platform ID as ObjectId:', platformObjectId);
    // Prepare base update data
    const updateData = {
      employeeId,
      deliveryDate,
      platformName: platformObjectId,  // Convert to ObjectId
      reviewLink: reviewLink || "",
      // Add the three new fields
      accountNo: accountNo || "",
      password: password || "",
      reviewDate: reviewDate ? new Date(reviewDate) : null,
      products: products.map(product => ({
        productId: product.productId,
        quantity: product.quantity,
        deliveryStatus: product.deliveryStatus || 'delivered',
        consumptionStatus: product.consumptionStatus || '0_consumed'
      }))
    };

    // Add screenshot if available
    if (req.file) {
      // Dynamically construct base URL from request
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      updateData.reviewScreenshot = `${baseUrl}/uploads/products/${req.file.filename}`;
      
      console.log('Screenshot attached to delivery record:', {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        fullUrl: updateData.reviewScreenshot
      });
    }

    console.log('Update data prepared:', updateData);

    // Find and update the delivery
    const updatedDelivery = await ProductDelivery.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedDelivery) {
      console.error('Delivery not found with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }
    
    console.log('Delivery updated successfully:', {
      id: updatedDelivery._id,
      orderId: updatedDelivery.orderId,
      employeeId: updatedDelivery.employeeId,
      platformName: updatedDelivery.platformName,
      reviewLink: updatedDelivery.reviewLink,
      accountNo: updatedDelivery.accountNo,
      hasPassword: !!updatedDelivery.password,
      reviewDate: updatedDelivery.reviewDate,
      hasScreenshot: !!updatedDelivery.reviewScreenshot
    });

    // Find the order to update product quantities
    const order = await ProductOrder.findOne({ orderId: orderId });

    if (!order) {
      console.error('Order not found with orderId:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update product quantities in the order
    const updatedProducts = order.products.map(orderProduct => {
      // Find the corresponding product in the update payload
      const updatedProduct = products.find(
        p => p.productId.toString() === orderProduct.productId.toString()
      );
      
      // If no update or quantity change is 0, return original product
      if (!updatedProduct || updatedProduct.quantityChange === 0) {
        return orderProduct;
      }
      
      console.log(`Processing product ${orderProduct.productId} with quantity change: ${updatedProduct.quantityChange}`);
      
      // Calculate new remaining quantity
      let newRemainingQuantity = orderProduct.remaining_quantity || 0;
      
      // If quantityChange is negative (e.g., -5), add to remaining quantity
      // If quantityChange is positive (e.g., +5), subtract from remaining quantity
      if (updatedProduct.quantityChange < 0) {
        // Adding back to remaining quantity
        newRemainingQuantity += Math.abs(updatedProduct.quantityChange);
        console.log(`Increasing remaining quantity by ${Math.abs(updatedProduct.quantityChange)}`);
      } else {
        // Subtracting from remaining quantity
        newRemainingQuantity -= updatedProduct.quantityChange;
        console.log(`Decreasing remaining quantity by ${updatedProduct.quantityChange}`);
      }
      
      // Ensure remaining quantity doesn't go below 0
      newRemainingQuantity = Math.max(0, newRemainingQuantity);
      
      console.log(`New remaining quantity: ${newRemainingQuantity}`);
      
      return {
        ...orderProduct.toObject(),
        remaining_quantity: newRemainingQuantity,
        // Optionally update delivery status if all quantity is consumed
        deliveryStatus: newRemainingQuantity === 0 ? 'Delivered' : orderProduct.deliveryStatus
      };
    });

    // Update the order with new product quantities
    const updatedOrder = await ProductOrder.findOneAndUpdate(
      { orderId: orderId },
      { products: updatedProducts },
      { new: true }
    );
    
    console.log('Order updated successfully:', {
      orderId: updatedOrder.orderId,
      status: updatedOrder.status,
      productsCount: updatedOrder.products.length
    });

    res.json({
      success: true,
      data: {
        delivery: updatedDelivery,
        updatedOrderProducts: updatedProducts
      }
    });
    
    console.log('==================== UPDATE DELIVERED PRODUCT - END ====================');
  } catch (error) {
    console.error('==================== UPDATE DELIVERED PRODUCT - ERROR ====================');
    console.error('Error updating delivery:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error updating delivery',
      error: error.message
    });
    console.error('==================== UPDATE DELIVERED PRODUCT - ERROR END ====================');
  }
};


// const UpdateDeliveredProduct = async (req, res) => {
//   try {     
//     const { id } = req.params;     
//     const {
//       orderId,
//       employeeId,
//       deliveryDate,
//       products
//     } = req.body;      

//     // Find and update the delivery
//     const updatedDelivery = await ProductDelivery.findByIdAndUpdate(
//       id,
//       {
//         employeeId,
//         deliveryDate,
//         products: products.map(product => ({
//           productId: product.productId,
//           quantity: product.quantity,
//           deliveryStatus: product.deliveryStatus || 'delivered',
//           consumptionStatus: product.consumptionStatus || '0_consumed'
//         }))
//       },
//       { new: true }
//     );

//     if (!updatedDelivery) {
//       return res.status(404).json({
//         success: false,
//         message: 'Delivery not found'
//       });
//     }

//     // Find the order to update product quantities
//     const order = await ProductOrder.findOne({ orderId: orderId });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: 'Order not found'
//       });
//     }

//     // Update product quantities in the order
//     const updatedProducts = order.products.map(orderProduct => {
//       // Find the corresponding product in the update payload
//       const updatedProduct = products.find(
//         p => p.productId.toString() === orderProduct.productId.toString()
//       );
       
//       // If no update or quantity change is 0, return original product
//       if (!updatedProduct || updatedProduct.quantityChange === 0) {
//         return orderProduct;
//       }
       
//       // Calculate new remaining quantity
//       let newRemainingQuantity = orderProduct.remaining_quantity || 0;
      
//       // If quantityChange is negative (e.g., -5), add to remaining quantity
//       // If quantityChange is positive (e.g., +5), subtract from remaining quantity
//       if (updatedProduct.quantityChange < 0) {
//         // Adding back to remaining quantity
//         newRemainingQuantity += Math.abs(updatedProduct.quantityChange);
//       } else {
//         // Subtracting from remaining quantity
//         newRemainingQuantity -= updatedProduct.quantityChange;
//       }

//       // Ensure remaining quantity doesn't go below 0
//       newRemainingQuantity = Math.max(0, newRemainingQuantity);
       
//       return {
//         ...orderProduct.toObject(),
//         remaining_quantity: newRemainingQuantity,
//         // Optionally update delivery status if all quantity is consumed
//         deliveryStatus: newRemainingQuantity === 0 ? 'Delivered' : orderProduct.deliveryStatus
//       };
//     });

//     // Update the order with new product quantities
//     const updatedOrder = await ProductOrder.findOneAndUpdate(
//       { orderId: orderId },
//       { products: updatedProducts },
//       { new: true }
//     );

//     res.json({
//       success: true,
//       data: {
//         delivery: updatedDelivery,
//         updatedOrderProducts: updatedProducts
//       }
//     });
//   } catch (error) {
//     console.error('Error updating delivery:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error updating delivery',
//       error: error.message
//     });
//   } 
// };

  const FindAllOrderedProductByOrderId= async (req, res) => {
    try {
      const { orderId } = req.params;
  
      const productOrder = await ProductOrder.findOne({ 
        orderId: orderId 
      }).populate([
        { path: 'brandName', select: '_id' },
        { 
          path: 'products.productId', 
          select: '_id quantity remaining_quantity' 
        }
      ]);
  
      if (!productOrder) {
        return res.status(404).json({ 
          success: false, 
          message: 'Order not found' 
        });
      }
  
      res.status(200).json({ 
        success: true, 
        data: {
          brandId: productOrder.brandName._id,
          products: productOrder.products.map(product => ({
            productId: product.productId._id,
            quantity: product.quantity,
            remaining_quantity: product.remaining_quantity,
            delivered_quantity: product.quantity - product.remaining_quantity
          }))
        }
      });
  
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Server error fetching order details',
        error: error.message 
      });
    }
  };


  const GetAllEmployees= async (req, res) => {
    try {
      // Find all users with role 'Employee'
      const employees = await User.find({ role: 'Employee' })
        .select('-password'); // Exclude password field for security
  
      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ message: 'Error fetching employees', error: error.message });
    }
  };

  const getUserById = async (req, res) => {
    try {
      // Validate if the provided ID is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
      }
  
      // Find user by ID and exclude sensitive information
      const user = await User.findById(req.params.id)
        .select('-password') // Exclude password field
        .lean(); // Convert to plain JavaScript object for easier manipulation
  
      // Check if user exists
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
  
      // Successful response
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  };

module.exports= {
    UpdateDeliveredProduct,
    FindAllOrderedProductByOrderId,
    GetAllEmployees,
    getUserById
  };