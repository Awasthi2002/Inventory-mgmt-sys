const moment = require('moment-timezone');
const Brand = require('../../models/Brand');
const User = require('../../models/User');

const Platform = require('../../models/Platform');

const bcrypt =require('bcrypt');

const mongoose = require('mongoose');

const upload = require('../../config/multer');
const ProductOrder = require('../../models/productOrder');
const ProductDelivery = require('../../models/ProductDelivery');
const ConsumedProduct = require('../../models/ConsumedProduct');



const GetBrandsByClientId = async(req, res) => {
    try {
        const { clientId } = req.params; // Get clientId from URL parameters
        
        // Validate if clientId is provided
        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Client ID is required'
            });
        }

        const brandList = await Brand.find({ clientId: clientId })
            .populate({
                path: 'employees',
                select: 'fullName email', // Add any other User fields you want to display
                model: 'User'
            })
            .populate({
                path: 'clientId',
                select: 'fullName', // Only populate fullName for client
                model: 'User'
            });

        res.status(200).json({
            success: true,
            message: `Brands retrieved successfully for client ID: ${clientId}`,
            data: brandList,
            count: brandList.length
        });

    } catch(error) {
        console.error('Error retrieving brands by client ID:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error retrieving brands by client ID'
        });
    }
};


// const FetchOrdersByClientId = async (req, res) => {
//   try {
//     const { clientId } = req.params; // Get clientId from URL parameters
    
//     // Validate if clientId is provided
//     if (!clientId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Client ID is required'
//       });
//     }

//     // Step 1: Get client information
//     const clientInfo = await User.findById(clientId).select('fullName email phone address');
    
//     if (!clientInfo) {
//       return res.status(404).json({
//         success: false,
//         message: 'Client not found'
//       });
//     }

//     // Step 2: Get all brands that belong to this client with full details
//     const clientBrands = await Brand.find({ clientId: clientId })
//       .populate('employees', 'fullName email')
//       .select('brandName products employees createdAt');
    
//     if (!clientBrands || clientBrands.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No brands found for this client ID'
//       });
//     }

//     // Step 3: Extract brand IDs
//     const brandIds = clientBrands.map(brand => brand._id);

//     // Step 4: Get all product orders for these brands
//     const orderData = await ProductOrder.find({ brandName: { $in: brandIds } })
//       .sort({ createdAt: -1 })
//       .populate('brandName', 'brandName products') // Populate the Brand's products
//       .populate('employeeName', 'fullName email phone address -_id') // Populate employee details
//       .populate('platformName', 'name reviewEnabled')
//       .populate({
//         path: 'selectedAccount',
//         // Select all fields for card and UPI details
//         select: `
//           name 
//           paymentType 
//           phoneNumber 
//           cardDetails {
//             cardNumber 
//             cardType 
//             expirationDate
//             cvv
//           }
//           upiDetails {
//             upiId 
//             bankName 
//             accountNumber 
//             ifscCode
//           }
//         `
//       });

//     // Manually attach product details for each order
//     const orderDataWithProductDetails = orderData.map(order => {
//       const productsWithDetails = order.products.map(orderProduct => {
//         // Find the product in Brand's products array by productId
//         const brandProduct = order.brandName.products.find(
//           brandProduct => brandProduct.productId.equals(orderProduct.productId)
//         );

//         // Attach the product details if found
//         return {
//           ...orderProduct.toObject(),
//           name: brandProduct ? brandProduct.name : null,
//           expiry_date: brandProduct ? brandProduct.expiry_date : null
//         };
//       });

//       // Return the order with updated products array and populated selectedAccount
//       return {
//         ...order.toObject(),
//         products: productsWithDetails,
//         // selectedAccount will now be a populated object with specified fields
//         selectedAccount: order.selectedAccount,
//         platformName: order.platformName
//       };
//     });

//     res.status(200).json({
//       success: true,
//       message: `Order data fetched successfully for client ID: ${clientId}`,
//             clientInfo: {
//         clientId: clientInfo._id,
//         fullName: clientInfo.fullName,
//         email: clientInfo.email,
//         relatedBrands: clientBrands.map(brand => ({
//           brandId: brand._id,
//           brandName: brand.brandName,
//           ordersCount: orderDataWithProductDetails.filter(order => 
//             order.brandName._id.toString() === brand._id.toString()
//           ).length
//         }))
//       },
//       data: orderDataWithProductDetails,
//     });

//   } catch (e) {
//     console.error('Error fetching order data by client ID:', e);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: e.message
//     });
//   }
// };



const FetchOrdersByClientId = async (req, res) => {
  try {
    const { clientId } = req.params; // Get clientId from URL parameters
    const { startDate, endDate } = req.query; // Get date range from query parameters
    
    // Validate if clientId is provided
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }

    // Step 1: Get client information
    const clientInfo = await User.findById(clientId).select('fullName email phone address');
    
    if (!clientInfo) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Step 2: Get all brands that belong to this client with full details
    const clientBrands = await Brand.find({ clientId: clientId })
      .populate('employees', 'fullName email')
      .select('brandName products employees createdAt');
    
    if (!clientBrands || clientBrands.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No brands found for this client ID'
      });
    }

    // Step 3: Extract brand IDs
    const brandIds = clientBrands.map(brand => brand._id);

    // Step 4: Build date filter for orders
    const dateFilter = {};
    
    if (startDate || endDate) {
      const timezone = 'Asia/Kolkata'; // Delhi timezone
      
      if (startDate) {
        // Convert start date to beginning of day in Delhi timezone
        const startMoment = moment.tz(startDate, timezone).startOf('day').utc();
        dateFilter.$gte = startMoment.toDate();
      }
      
      if (endDate) {
        // Convert end date to end of day in Delhi timezone
        const endMoment = moment.tz(endDate, timezone).endOf('day').utc();
        dateFilter.$lte = endMoment.toDate();
      }
    }

    // Step 5: Build query object for ProductOrder
    const orderQuery = { brandName: { $in: brandIds } };
    
    // Add date filter to query if dates are provided
    if (Object.keys(dateFilter).length > 0) {
      orderQuery.createdAt = dateFilter;
    }

    // Step 6: Get all product orders for these brands with date filtering
    const orderData = await ProductOrder.find(orderQuery)
      .sort({ createdAt: -1 })
      .populate('brandName', 'brandName products') // Populate the Brand's products
      .populate('employeeName', 'fullName email phone address -_id') // Populate employee details
      .populate('platformName', 'name reviewEnabled')
      .populate({
        path: 'selectedAccount',
        // Select all fields for card and UPI details
        select: `
          name 
          paymentType 
          phoneNumber 
          cardDetails {
            cardNumber 
            cardType 
            expirationDate
            cvv
          }
          upiDetails {
            upiId 
            bankName 
            accountNumber 
            ifscCode
          }
        `
      });

    // Manually attach product details for each order
    const orderDataWithProductDetails = orderData.map(order => {
      const productsWithDetails = order.products.map(orderProduct => {
        // Find the product in Brand's products array by productId
        const brandProduct = order.brandName.products.find(
          brandProduct => brandProduct.productId.equals(orderProduct.productId)
        );

        // Attach the product details if found
        return {
          ...orderProduct.toObject(),
          name: brandProduct ? brandProduct.name : null,
          expiry_date: brandProduct ? brandProduct.expiry_date : null
        };
      });

      // Return the order with updated products array and populated selectedAccount
      return {
        ...order.toObject(),
        products: productsWithDetails,
        // selectedAccount will now be a populated object with specified fields
        selectedAccount: order.selectedAccount,
        platformName: order.platformName
      };
    });

    // Build response message with date range info
    let message = `Order data fetched successfully for client ID: ${clientId}`;
    if (startDate || endDate) {
      const dateRangeInfo = [];
      if (startDate) dateRangeInfo.push(`from ${startDate}`);
      if (endDate) dateRangeInfo.push(`to ${endDate}`);
      message += ` (${dateRangeInfo.join(' ')})`;
    }

    res.status(200).json({
      success: true,
      message: message,
      dateFilter: {
        startDate: startDate || null,
        endDate: endDate || null,
        timezone: 'Asia/Kolkata'
      },
      clientInfo: {
        clientId: clientInfo._id,
        fullName: clientInfo.fullName,
        email: clientInfo.email,
        relatedBrands: clientBrands.map(brand => ({
          brandId: brand._id,
          brandName: brand.brandName,
          ordersCount: orderDataWithProductDetails.filter(order => 
            order.brandName._id.toString() === brand._id.toString()
          ).length
        }))
      },
      data: orderDataWithProductDetails,
    });
    
  } catch (e) {
    console.error('Error fetching order data by client ID:', e);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: e.message
    });
  }
};


// const fetchDeliveredProductByClientId = async (req, res) => {
//   try {
//     const { clientId } = req.params; // Get clientId from URL parameters
    
//     // Validate if clientId is provided
//     if (!clientId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Client ID is required'
//       });
//     }

//     // Step 1: Get client information
//     const clientInfo = await User.findById(clientId).select('fullName email');
    
//     if (!clientInfo) {
//       return res.status(404).json({
//         success: false,
//         message: 'Client not found'
//       });
//     }

//     // Step 2: Get all brands that belong to this client
//     const clientBrands = await Brand.find({ clientId: clientId }).select('_id brandName');
    
//     if (!clientBrands || clientBrands.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No brands found for this client ID'
//       });
//     }

//     // Step 3: Extract brand IDs
//     const brandIds = clientBrands.map(brand => brand._id);

//     // Step 4: Fetch product deliveries with detailed population for client's brands
//     const productDeliveries = await ProductDelivery.aggregate([
//       // Match only deliveries for client's brands
//       {
//         $match: {
//           brandId: { $in: brandIds }
//         }
//       },
//       // Lookup brand details
//       {
//         $lookup: {
//           from: 'brands',
//           localField: 'brandId',
//           foreignField: '_id',
//           as: 'brandDetails'
//         }
//       },
//       // Unwind brand details
//       { $unwind: '$brandDetails' },
      
//       // Lookup employee details
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'employeeId',
//           foreignField: '_id',
//           as: 'employeeDetails'
//         }
//       },
//       { $unwind: '$employeeDetails' },
      
//       // Lookup platform details - Updated to look up by ObjectId
//       {
//         $lookup: {
//           from: 'platforms',
//           localField: 'platformName',
//           foreignField: '_id',
//           as: 'platformDetails'
//         }
//       },
//       {
//         $addFields: {
//           platformDetails: {
//             $cond: {
//               if: { $gt: [{ $size: "$platformDetails" }, 0] },
//               then: { $arrayElemAt: ["$platformDetails", 0] },
//               else: null
//             }
//           }
//         }
//       },
      
//       // Project to reshape the output and include product details
//       {
//         $project: {
//           orderId: 1,
//           deliveryDate: 1,
//           reviewScreenshot: 1,
//           reviewLink: 1,
//           accountNo: 1,        // Include accountNo field
//           password: 1,         // Include password field
//           reviewDate: 1,       // Include reviewDate field
//           'platform': {
//             '_id': '$platformName',
//             'name': { $ifNull: ['$platformDetails.name', null] },
//             'reviewEnabled': { $ifNull: ['$platformDetails.reviewEnabled', false] }
//           },
//           'brand': {
//             '_id': '$brandDetails._id',
//             'brandName': '$brandDetails.brandName'
//           },
//           'employee': {
//             '_id': '$employeeDetails._id',
//             'fullName': '$employeeDetails.fullName'
//           },
//           'products': {
//             $map: {
//               input: '$products',
//               as: 'prod',
//               in: {
//                 $mergeObjects: [
//                   '$$prod',
//                   // Find matching product in brand's products array
//                   {
//                     $arrayElemAt: [
//                       {
//                         $filter: {
//                           input: '$brandDetails.products',
//                           as: 'brandProd',
//                           cond: { $eq: ['$$brandProd.productId', '$$prod.productId'] }
//                         }
//                       },
//                       0
//                     ]
//                   }
//                 ]
//               }
//             }
//           }
//         }
//       },
//       // Sort by delivery date (newest first)
//       { $sort: { deliveryDate: -1 } }
//     ]);

//     // If no deliveries found
//     if (productDeliveries.length === 0) {
//       return res.status(404).json({ 
//         success: false,
//         message: 'No product deliveries found for this client'
//       });
//     }

//     // Calculate delivery counts per brand
//     const brandDeliveryCounts = clientBrands.map(brand => {
//       const deliveryCount = productDeliveries.filter(delivery => 
//         delivery.brand._id.toString() === brand._id.toString()
//       ).length;
      
//       return {
//         brandId: brand._id,
//         brandName: brand.brandName,
//         deliveryCount: deliveryCount
//       };
//     });

//     res.status(200).json({
//       success: true,
//       message: `Product deliveries fetched successfully for client ID: ${clientId}`,
//       data: productDeliveries,
//       clientInfo: {
//         clientId: clientInfo._id,
//         fullName: clientInfo.fullName,
//         email: clientInfo.email,
//         relatedBrands: brandDeliveryCounts
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching detailed product deliveries by client ID:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };



const fetchDeliveredProductByClientId = async (req, res) => {
  try {
    const { clientId } = req.params; // Get clientId from URL parameters
    const { startDate, endDate } = req.query; // Get date range from query parameters
    
    // Validate if clientId is provided
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }

    // Step 1: Get client information
    const clientInfo = await User.findById(clientId).select('fullName email');
    
    if (!clientInfo) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Step 2: Get all brands that belong to this client
    const clientBrands = await Brand.find({ clientId: clientId }).select('_id brandName');
    
    if (!clientBrands || clientBrands.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No brands found for this client ID'
      });
    }

    // Step 3: Extract brand IDs
    const brandIds = clientBrands.map(brand => brand._id);

    // Step 4: Build date filter for deliveries
    const matchQuery = { brandId: { $in: brandIds } };
    
    if (startDate || endDate) {
      const timezone = 'Asia/Kolkata'; // Delhi timezone
      const dateFilter = {};
      
      if (startDate) {
        // Convert start date to beginning of day in Delhi timezone
        const startMoment = moment.tz(startDate, timezone).startOf('day').utc();
        dateFilter.$gte = startMoment.toDate();
      }
      
      if (endDate) {
        // Convert end date to end of day in Delhi timezone
        const endMoment = moment.tz(endDate, timezone).endOf('day').utc();
        dateFilter.$lte = endMoment.toDate();
      }
      
      // Add date filter to match query
      matchQuery.deliveryDate = dateFilter;
    }

    // Step 5: Fetch product deliveries with detailed population for client's brands
    const productDeliveries = await ProductDelivery.aggregate([
      // Match only deliveries for client's brands with date filter
      {
        $match: matchQuery
      },
      // Lookup brand details
      {
        $lookup: {
          from: 'brands',
          localField: 'brandId',
          foreignField: '_id',
          as: 'brandDetails'
        }
      },
      // Unwind brand details
      { $unwind: '$brandDetails' },
      
      // Lookup employee details
      {
        $lookup: {
          from: 'users',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employeeDetails'
        }
      },
      { $unwind: '$employeeDetails' },
      
      // Lookup platform details - Updated to look up by ObjectId
      {
        $lookup: {
          from: 'platforms',
          localField: 'platformName',
          foreignField: '_id',
          as: 'platformDetails'
        }
      },
      {
        $addFields: {
          platformDetails: {
            $cond: {
              if: { $gt: [{ $size: "$platformDetails" }, 0] },
              then: { $arrayElemAt: ["$platformDetails", 0] },
              else: null
            }
          }
        }
      },
      
      // Project to reshape the output and include product details
      {
        $project: {
          orderId: 1,
          deliveryDate: 1,
          reviewScreenshot: 1,
          reviewLink: 1,
          accountNo: 1,        // Include accountNo field
          password: 1,         // Include password field
          reviewDate: 1,       // Include reviewDate field
          'platform': {
            '_id': '$platformName',
            'name': { $ifNull: ['$platformDetails.name', null] },
            'reviewEnabled': { $ifNull: ['$platformDetails.reviewEnabled', false] }
          },
          'brand': {
            '_id': '$brandDetails._id',
            'brandName': '$brandDetails.brandName'
          },
          'employee': {
            '_id': '$employeeDetails._id',
            'fullName': '$employeeDetails.fullName'
          },
          'products': {
            $map: {
              input: '$products',
              as: 'prod',
              in: {
                $mergeObjects: [
                  '$$prod',
                  // Find matching product in brand's products array
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$brandDetails.products',
                          as: 'brandProd',
                          cond: { $eq: ['$$brandProd.productId', '$$prod.productId'] }
                        }
                      },
                      0
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      // Sort by delivery date (newest first)
      { $sort: { deliveryDate: -1 } }
    ]);

    // If no deliveries found
    if (productDeliveries.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No product deliveries found for this client'
      });
    }

    // Calculate delivery counts per brand
    const brandDeliveryCounts = clientBrands.map(brand => {
      const deliveryCount = productDeliveries.filter(delivery => 
        delivery.brand._id.toString() === brand._id.toString()
      ).length;
      
      return {
        brandId: brand._id,
        brandName: brand.brandName,
        deliveryCount: deliveryCount
      };
    });

    // Build response message with date range info
    let message = `Product deliveries fetched successfully for client ID: ${clientId}`;
    if (startDate || endDate) {
      const dateRangeInfo = [];
      if (startDate) dateRangeInfo.push(`from ${startDate}`);
      if (endDate) dateRangeInfo.push(`to ${endDate}`);
      message += ` (${dateRangeInfo.join(' ')})`;
    }

    res.status(200).json({
      success: true,
      message: message,
      dateFilter: {
        startDate: startDate || null,
        endDate: endDate || null,
        timezone: 'Asia/Kolkata'
      },
      data: productDeliveries,
      clientInfo: {
        clientId: clientInfo._id,
        fullName: clientInfo.fullName,
        email: clientInfo.email,
        relatedBrands: brandDeliveryCounts
      }
    });

  } catch (error) {
    console.error('Error fetching detailed product deliveries by client ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


const changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    console.log('Request Body:', req.body); // Log the request body

    if (!userId || !currentPassword || !newPassword) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.log('Current password is incorrect');
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    console.log('Hashed Password:', hashedPassword); // Log the hashed password

    user.password = hashedPassword;
    await user.save();

    console.log('Password changed successfully');
    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    return res.status(500).json({ error: err.message });
  }
};


const UpdateUser = async (req, res) => {
  try {
    const { userId, fullName, email, phone, address } = req.body;

    if (!userId || !fullName || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.fullName = fullName;
    user.email = email;
    user.phone = phone;
    user.address = address;

    await user.save();

    return res.status(200).json({ message: 'User details updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


const getUserDetailsById = async(req,res)=>{
  try {
    const client = await User.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Error fetching client details:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


module.exports = { GetBrandsByClientId,
    FetchOrdersByClientId,
    fetchDeliveredProductByClientId,
    changePassword,
    UpdateUser,
    getUserDetailsById
};