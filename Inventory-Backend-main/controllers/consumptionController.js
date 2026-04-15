const moment = require('moment-timezone');
const Brand = require('../models/Brand');
const User = require('../models/User');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const path = require('path');
const upload = require('../config/multer');
const ProductOrder = require('../models/productOrder');
const ProductDelivery = require('../models/ProductDelivery');
const ConsumedProduct = require('../models/ConsumedProduct');



const getAllProductDeliveries = async (req, res) => {
  try {
    const aggregatedDeliveries = await ProductDelivery.aggregate([
      // Lookup to get brand details
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
      
      // Unwind the products array to work with individual products
      { $unwind: '$products' },
      
      // Group by brand and product
      {
        $group: {
          _id: {
            brandId: '$brandId',
            brandName: '$brandDetails.brandName',
            productId: '$products.productId'
          },
          productDetails: {
            $first: {
              // Find the matching product in the brand's embedded products
              $filter: {
                input: '$brandDetails.products',
                as: 'brandProduct',
                cond: { $eq: ['$$brandProduct.productId', '$products.productId'] }
              }
            }
          },
          totalDeliveredQuantity: { $sum: '$products.quantity' },
          deliveryDates: { $push: '$deliveryDate' },
          consumptionStatuses: { $addToSet: '$products.consumptionStatus' },
          deliveryStatuses: { $addToSet: '$products.deliveryStatus' }
        }
      },

      // Lookup consumed products
      {
        $lookup: {
          from: 'consumedproducts',
          let: { 
            brandId: '$_id.brandId', 
            productId: '$_id.productId' 
          },
          pipeline: [
            { $unwind: '$productDetails' },
            { $unwind: '$productDetails.products' },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$productDetails.brandId', '$$brandId'] },
                    { $eq: ['$productDetails.products.productId', '$$productId'] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                totalConsumedQuantity: { $sum: '$productDetails.products.consumedQuantity' }
              }
            }
          ],
          as: 'consumedQuantityDetails'
        }
      },
      
      // Group again to consolidate by brand
      {
        $group: {
          _id: '$_id.brandId',
          brandId: { $first: '$_id.brandId' },
          brandName: { $first: '$_id.brandName' },
          products: {
            $push: {
              productId: '$_id.productId',
              productDetails: { $arrayElemAt: ['$productDetails', 0] },
              totalDeliveredQuantity: '$totalDeliveredQuantity',
              consumptionStatuses: '$consumptionStatuses',
              deliveryStatuses: '$deliveryStatuses',
              consumedQuantityDetails: { $arrayElemAt: ['$consumedQuantityDetails', 0] }
            }
          }
        }
      },
      
      // Project to shape the final output
      {
        $project: {
          _id: '$brandId',
          brandId: 1,
          brandName: 1,
          products: {
            $map: {
              input: '$products',
              as: 'product',
              in: {
                productId: '$$product.productId',
                productDetails: '$$product.productDetails',
                totalDeliveredQuantity: '$$product.totalDeliveredQuantity',
                consumptionStatuses: '$$product.consumptionStatuses',
                deliveryStatuses: '$$product.deliveryStatuses',
                totalConsumedQuantity: { 
                  $ifNull: ['$$product.consumedQuantityDetails.totalConsumedQuantity', 0] 
                },
                availableQuantity: {
                  $subtract: [
                    '$$product.totalDeliveredQuantity',
                    { $ifNull: ['$$product.consumedQuantityDetails.totalConsumedQuantity', 0] }
                  ]
                }
              }
            }
          }
        }
      }
    ]);

    res.json(aggregatedDeliveries);
  } catch (error) {
    console.error('Error fetching aggregated deliveries:', error);
    res.status(500).json({
      message: 'Error fetching aggregated deliveries',
      error: error.message
    });
  }
};



const getAllConsumedProducts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // or req.params if using route params
    
    // Build the query object for date filtering
    let query = {};
    
    // If date range is provided, add date filter
    if (startDate || endDate) {
      query.date = {};
      
      if (startDate) {
        // Convert start date to India timezone and set to start of day
        const startDateTime = moment.tz(startDate, 'Asia/Kolkata').startOf('day').utc().toDate();
        query.date.$gte = startDateTime;
      }
      
      if (endDate) {
        // Convert end date to India timezone and set to end of day
        const endDateTime = moment.tz(endDate, 'Asia/Kolkata').endOf('day').utc().toDate();
        query.date.$lte = endDateTime;
      }
    }
    
    // Fetch consumed products with full population of references and date filter
    const consumedProducts = await ConsumedProduct.find(query)
      .populate({
        path: 'employeeId',
        select: 'fullName email'
      })
      .populate({
        path: 'productDetails.brandId',
        model: 'Brand',
        populate: {
          path: 'products'  // Populate all product details in the brand
        }
      })
      .sort({ date: -1 }) // Sort by date (newest first)
      .lean();

    // Transform data to extract full product details
    const formattedProducts = consumedProducts.map(product => {
      const productDetails = product.productDetails.flatMap(brandDetail => {
        // Get the full brand information
        const brandInfo = brandDetail.brandId;

        // Map consumed products to their full details
        return brandDetail.products.map(consumedProduct => {
          // Find the full product details from the brand
          const fullProductDetails = brandInfo.products.find(
            p => p.productId.toString() === consumedProduct.productId.toString()
          );

          return {
            brandName: brandInfo.brandName,
            consumedQuantity: consumedProduct.consumedQuantity,
            productDetails: fullProductDetails || {
              productId: consumedProduct.productId,
              name: 'Unknown Product',
              image: null,
              noExpiry: false,
              expiry_date: null
            }
          };
        });
      });

      return {
        _id: product._id,
        employeeId: product.employeeId,
        date: product.date,
        // Add formatted date in India timezone
        dateIST: moment(product.date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
        totalConsumedQuantity: productDetails.reduce((total, product) => 
          total + product.consumedQuantity, 0
        ),
        productDetails: productDetails
      };
    });

    res.status(200).json({
      status: 'success',
      results: formattedProducts.length,
      data: formattedProducts,
      // Add filter info in response
      filterInfo: {
        startDate: startDate ? moment.tz(startDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
        endDate: endDate ? moment.tz(endDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
        timezone: 'Asia/Kolkata',
        totalRecords: formattedProducts.length
      }
    });
  } catch (error) {
    console.error('Error in getAllConsumedProducts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch consumed products',
      error: error.message,
      // Include filter info even in error response for debugging
      filterInfo: req.query.startDate || req.query.endDate ? {
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
        timezone: 'Asia/Kolkata'
      } : null
    });
  }
};



const CreateConsumedProduct = async (req, res) => {
  try {
    console.log('=== Starting CreateConsumedProduct Process ===');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));

    // Destructure request body
    const { employeeId, date, productDetails } = req.body;

    // Validate input
    if (!employeeId) {
      console.log('Validation Failed: Missing Employee ID');
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    if (!date) {
      console.log('Validation Failed: Missing Date');
      return res.status(400).json({ message: 'Date is required' });
    }

    if (!productDetails || !Array.isArray(productDetails) || productDetails.length === 0) {
      console.log('Validation Failed: Invalid Product Details', { productDetails });
      return res.status(400).json({ message: 'Product details are required' });
    }

    // Validate and process product details with delivery status update
    const validatedProductDetails = [];
    console.log('Starting Product Details Processing');
    
    for (const detail of productDetails) {
      console.log('\n=== Processing Brand ===', { brandId: detail.brandId });
      
      // Validate brandId
      if (!detail.brandId || !mongoose.Types.ObjectId.isValid(detail.brandId)) {
        console.log('Invalid Brand ID detected:', detail.brandId);
        throw new Error('Invalid Brand ID');
      }

      // Find all delivery records for this brand
      const deliveryRecords = await ProductDelivery.find({ 
        brandId: detail.brandId,
        'products.deliveryStatus': 'delivered' 
      }).sort({ createdAt: 1 });

      console.log('Found Delivery Records:', {
        brandId: detail.brandId,
        recordCount: deliveryRecords.length
      });

      if (!deliveryRecords.length) {
        console.log('No delivery records found for brand:', detail.brandId);
        throw new Error(`No delivery records found for brand ${detail.brandId}`);
      }

      const brandProducts = [];

      // Process each product in the detail
      for (const product of detail.products) {
        console.log('\n--- Processing Product ---', {
          productId: product.productId,
          requestedQuantity: product.consumedQuantity
        });

        // Validate productId
        if (!product.productId || !mongoose.Types.ObjectId.isValid(product.productId)) {
          console.log('Invalid Product ID detected:', product.productId);
          throw new Error('Invalid Product ID');
        }

        // Validate consumed quantity
        if (typeof product.consumedQuantity !== 'number' || product.consumedQuantity <= 0) {
          console.log('Invalid Consumed Quantity:', product.consumedQuantity);
          throw new Error('Invalid Consumed Quantity');
        }

        let remainingQuantityToConsume = product.consumedQuantity;
        let consumedFromDeliveries = [];

        console.log('Starting to process deliveries for consumption');

        // Update consumption status across delivery records
        for (const deliveryRecord of deliveryRecords) {
          console.log('\nChecking Delivery Record:', {
            deliveryId: deliveryRecord._id,
            remainingToConsume: remainingQuantityToConsume
          });

          const deliveredProduct = deliveryRecord.products.find(
            p => p.productId.toString() === product.productId.toString()
          );

          if (deliveredProduct && deliveredProduct.deliveryStatus === 'delivered') {
            // Check if product is already fully consumed
            const currentConsumptionStatus = deliveredProduct.consumptionStatus || 'not_consumed';
            const [consumedQuantityStr] = currentConsumptionStatus.split('_');
            const currentlyConsumedQuantity = consumedQuantityStr === 'not' ? 0 : parseInt(consumedQuantityStr);

            console.log('Delivery Status Check:', {
              deliveryId: deliveryRecord._id,
              totalQuantity: deliveredProduct.quantity,
              currentlyConsumed: currentlyConsumedQuantity,
              consumptionStatus: currentConsumptionStatus
            });

            // Skip this delivery if it's already fully consumed
            if (currentlyConsumedQuantity >= deliveredProduct.quantity) {
              console.log('Skipping fully consumed delivery:', deliveryRecord._id);
              continue;
            }
            
            // Calculate available quantity in this record
            const availableQuantity = deliveredProduct.quantity - currentlyConsumedQuantity;
            
            console.log('Availability Check:', {
              deliveryId: deliveryRecord._id,
              availableQuantity,
              remainingToConsume: remainingQuantityToConsume
            });

            if (availableQuantity > 0) {
              // Calculate how much can be consumed from this record
              const quantityToConsume = Math.min(remainingQuantityToConsume, availableQuantity);
              
              if (quantityToConsume > 0) {
                const newConsumedQuantity = currentlyConsumedQuantity + quantityToConsume;
                
                console.log('Updating Consumption:', {
                  deliveryId: deliveryRecord._id,
                  quantityToConsume,
                  newTotalConsumed: newConsumedQuantity
                });

                // Update consumption status
                await ProductDelivery.updateOne(
                  { 
                    _id: deliveryRecord._id,
                    'products.productId': product.productId 
                  },
                  {
                    $set: {
                      'products.$.consumptionStatus': `${newConsumedQuantity}_consumed`
                    }
                  }
                );

                consumedFromDeliveries.push({
                  deliveryId: deliveryRecord._id,
                  quantity: quantityToConsume
                });

                remainingQuantityToConsume -= quantityToConsume;
                console.log('Remaining quantity to consume:', remainingQuantityToConsume);

                if (remainingQuantityToConsume === 0) {
                  console.log('Consumption complete for product');
                  break;
                }
              }
            }
          }
        }

        // Check if we couldn't consume all requested quantity
        if (remainingQuantityToConsume > 0) {
          console.log('Insufficient quantity available:', {
            productId: product.productId,
            requested: product.consumedQuantity,
            unfulfilled: remainingQuantityToConsume
          });
          throw new Error(`Insufficient available quantity for product ${product.productId}. Required: ${product.consumedQuantity}, Available: ${product.consumedQuantity - remainingQuantityToConsume}`);
        }

        console.log('Product consumption recorded successfully:', {
          productId: product.productId,
          totalConsumed: product.consumedQuantity,
          deliveriesUsed: consumedFromDeliveries.length
        });

        brandProducts.push({
          productId: product.productId,
          consumedQuantity: product.consumedQuantity,
          consumedFromDeliveries
        });
      }

      validatedProductDetails.push({
        brandId: detail.brandId,
        products: brandProducts
      });
    }

    console.log('All products processed successfully. Creating consumption record...');

    // Create new consumed product entry
    const newConsumedProduct = new ConsumedProduct({
      employeeId,
      date,
      productDetails: validatedProductDetails
    });

    // Save to database
    const savedConsumedProduct = await newConsumedProduct.save();
    console.log('Consumption record saved successfully:', savedConsumedProduct._id);

    // Respond with saved document
    res.status(201).json({
      message: 'Consumed products recorded successfully',
      data: savedConsumedProduct
    });

  } catch (error) {
    console.error('Error in consumed products submission:', {
      error: error.message,
      stack: error.stack
    });

    // Handle specific validation errors
    if (error.message.includes('Invalid Brand ID')) {
      return res.status(400).json({ message: 'Invalid Brand ID provided' });
    }

    if (error.message.includes('Invalid Product ID')) {
      return res.status(400).json({ message: 'Invalid Product ID provided' });
    }

    if (error.message.includes('Invalid Consumed Quantity')) {
      return res.status(400).json({ message: 'Invalid Consumed Quantity' });
    }

    if (error.message.includes('No delivery records found')) {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('Insufficient available quantity')) {
      return res.status(400).json({ message: error.message });
    }

    // Generic error response
    res.status(500).json({
      message: 'Failed to record consumed products',
      error: error.message
    });
  }
};


// const CreateConsumedProduct = async (req, res) => {
//   try {
//     // Destructure request body
//     const { employeeId, date, productDetails } = req.body;

//     // Validate input
//     if (!employeeId) {
//       return res.status(400).json({ message: 'Employee ID is required' });
//     }

//     if (!date) {
//       return res.status(400).json({ message: 'Date is required' });
//     }

//     if (!productDetails || !Array.isArray(productDetails) || productDetails.length === 0) {
//       return res.status(400).json({ message: 'Product details are required' });
//     }

//     // Validate and process product details with delivery status update
//     const validatedProductDetails = [];
    
//     for (const detail of productDetails) {
//       // Validate brandId
//       if (!detail.brandId || !mongoose.Types.ObjectId.isValid(detail.brandId)) {
//         throw new Error('Invalid Brand ID');
//       }

//       // Find all delivery records for this brand
//       const deliveryRecords = await ProductDelivery.find({ 
//         brandId: detail.brandId,
//         'products.deliveryStatus': 'delivered' 
//       }).sort({ createdAt: 1 });

//       if (!deliveryRecords.length) {
//         throw new Error(`No delivery records found for brand ${detail.brandId}`);
//       }

//       const brandProducts = [];

//       // Process each product in the detail
//       for (const product of detail.products) {
//         // Validate productId
//         if (!product.productId || !mongoose.Types.ObjectId.isValid(product.productId)) {
//           throw new Error('Invalid Product ID');
//         }

//         // Validate consumed quantity
//         if (typeof product.consumedQuantity !== 'number' || product.consumedQuantity <= 0) {
//           throw new Error('Invalid Consumed Quantity');
//         }

//         let remainingQuantityToConsume = product.consumedQuantity;
//         let consumedFromDeliveries = [];

//         // Update consumption status across delivery records
//         for (const deliveryRecord of deliveryRecords) {
//           const deliveredProduct = deliveryRecord.products.find(
//             p => p.productId.toString() === product.productId.toString()
//           );

//           if (deliveredProduct && deliveredProduct.deliveryStatus === 'delivered') {
//             // Calculate already consumed quantity
//             let alreadyConsumedQuantity = 0;
//             if (deliveredProduct.consumptionStatus && deliveredProduct.consumptionStatus !== 'not_consumed') {
//               alreadyConsumedQuantity = parseInt(deliveredProduct.consumptionStatus.split('_')[0]);
//             }
            
//             // Calculate available quantity in this record
//             const availableQuantity = deliveredProduct.quantity - alreadyConsumedQuantity;
            
//             if (availableQuantity > 0) {
//               // Calculate how much can be consumed from this record
//               const quantityToConsume = Math.min(remainingQuantityToConsume, availableQuantity);
              
//               if (quantityToConsume > 0) {
//                 const newConsumedQuantity = alreadyConsumedQuantity + quantityToConsume;
                
//                 // Update consumption status
//                 await ProductDelivery.updateOne(
//                   { 
//                     _id: deliveryRecord._id,
//                     'products.productId': product.productId 
//                   },
//                   {
//                     $set: {
//                       'products.$.consumptionStatus': `${newConsumedQuantity}_consumed`
//                     }
//                   }
//                 );

//                 consumedFromDeliveries.push({
//                   deliveryId: deliveryRecord._id,
//                   quantity: quantityToConsume
//                 });

//                 remainingQuantityToConsume -= quantityToConsume;

//                 if (remainingQuantityToConsume === 0) break;
//               }
//             }
//           }
//         }

//         // Check if we couldn't consume all requested quantity
//         if (remainingQuantityToConsume > 0) {
//           throw new Error(`Insufficient available quantity for product ${product.productId}. Required: ${product.consumedQuantity}, Available: ${product.consumedQuantity - remainingQuantityToConsume}`);
//         }

//         brandProducts.push({
//           productId: product.productId,
//           consumedQuantity: product.consumedQuantity,
//           consumedFromDeliveries
//         });
//       }

//       validatedProductDetails.push({
//         brandId: detail.brandId,
//         products: brandProducts
//       });
//     }

//     // Create new consumed product entry
//     const newConsumedProduct = new ConsumedProduct({
//       employeeId,
//       date,
//       productDetails: validatedProductDetails
//     });

//     // Save to database
//     const savedConsumedProduct = await newConsumedProduct.save();

//     // Respond with saved document
//     res.status(201).json({
//       message: 'Consumed products recorded successfully',
//       data: savedConsumedProduct
//     });

//   } catch (error) {
//     console.error('Error in consumed products submission:', error);

//     // Handle specific validation errors
//     if (error.message.includes('Invalid Brand ID')) {
//       return res.status(400).json({ message: 'Invalid Brand ID provided' });
//     }

//     if (error.message.includes('Invalid Product ID')) {
//       return res.status(400).json({ message: 'Invalid Product ID provided' });
//     }

//     if (error.message.includes('Invalid Consumed Quantity')) {
//       return res.status(400).json({ message: 'Invalid Consumed Quantity' });
//     }

//     if (error.message.includes('No delivery records found')) {
//       return res.status(404).json({ message: error.message });
//     }

//     if (error.message.includes('Insufficient available quantity')) {
//       return res.status(400).json({ message: error.message });
//     }

//     // Generic error response
//     res.status(500).json({
//       message: 'Failed to record consumed products',
//       error: error.message
//     });
//   }
// };


const DeleteConsumedProduct = async (req, res) => {
  try {
    const consumedProductId = req.params.id;

    console.log('Starting DeleteConsumedProduct process');
    console.log('Consumed Product ID:', consumedProductId);

    // Step 1: Fetch the consumed product details
    const consumedProduct = await ConsumedProduct.findById(consumedProductId);

    if (!consumedProduct) {
      console.log('Consumed product not found');
      return res.status(404).json({
        success: false,
        message: 'Consumed product not found'
      });
    }

    // Detailed logging of consumed product details
    console.log('Consumed Product Details:', {
      _id: consumedProduct._id,
      employeeId: consumedProduct.employeeId,
      date: consumedProduct.date,
      totalBrands: consumedProduct.productDetails.length
    });

    // Array to store processing details
    const processingDetails = [];

    // Step 2: Process each brand in the consumed product
    for (const brandDetail of consumedProduct.productDetails) {
      const brandId = brandDetail.brandId;

      console.log('\n--- Processing Brand ---');
      console.log('Brand ID:', brandId);

      // Find all delivery records for this specific brand
      const deliveryRecords = await ProductDelivery.find({
        brandId: brandId,
        deliveryDate: { $lte: new Date(new Date(consumedProduct.date).setHours(23, 59, 59, 999))}
      }).sort({ createdAt: -1 });

      console.log('Delivery Records Found:', deliveryRecords.length);

      // If no delivery records found for this brand, skip to next brand
      if (!deliveryRecords.length) {
        console.log(`No delivery records found for brand ${brandId}`);
        processingDetails.push({
          brandId: brandId,
          status: 'No delivery records found',
          products: []
        });
        continue;
      }

      // Brand-level processing details
      const brandProcessingDetails = {
        brandId: brandId,
        products: []
      };

      // Process each product in this brand
      for (const productItem of brandDetail.products) {
        const productId = productItem.productId;
        let remainingQuantityToSubtract = productItem.consumedQuantity;

        console.log('\n-- Processing Product --');
        console.log('Product ID:', productId);
        console.log('Consumed Quantity:', remainingQuantityToSubtract);

        const productProcessingDetails = {
          productId: productId,
          originalConsumedQuantity: remainingQuantityToSubtract,
          deliveryRecordAdjustments: []
        };

        // Go through each delivery record for this brand
        for (const deliveryRecord of deliveryRecords) {
          console.log('Checking Delivery Record:', deliveryRecord._id);

          // Find the specific product in the delivery record
          const deliveryProductIndex = deliveryRecord.products.findIndex(
            p => p.productId.toString() === productId.toString()
          );

          // If product found in this delivery record
          if (deliveryProductIndex !== -1) {
            const deliveryProduct = deliveryRecord.products[deliveryProductIndex];

            // Parse current consumed quantity
            const currentConsumed = parseInt(deliveryProduct.consumptionStatus.split('_')[0] || '0');

            console.log('Delivery Record Product Details:', {
              deliveryRecordId: deliveryRecord._id,
              currentConsumedStatus: deliveryProduct.consumptionStatus,
              currentConsumed: currentConsumed
            });

            // Skip if no consumed quantity
            if (currentConsumed === 0) {
              console.log('Current consumed quantity is 0, skipping');
              continue;
            }

            // Calculate quantity to subtract
            const quantityToSubtract = Math.min(
              currentConsumed,
              remainingQuantityToSubtract
            );

            // Calculate new consumed quantity
            const newConsumedQuantity = currentConsumed - quantityToSubtract;

            console.log('Quantity Adjustment:', {
              quantityToSubtract: quantityToSubtract,
              newConsumedQuantity: newConsumedQuantity
            });

            // Update consumption status
            deliveryProduct.consumptionStatus = `${newConsumedQuantity}_consumed`;

            // Save the updated delivery record
            await deliveryRecord.save();

            // Track this adjustment
            productProcessingDetails.deliveryRecordAdjustments.push({
              deliveryRecordId: deliveryRecord._id,
              quantitySubtracted: quantityToSubtract,
              newConsumedStatus: deliveryProduct.consumptionStatus
            });

            // Update remaining quantity to subtract
            remainingQuantityToSubtract -= quantityToSubtract;

            // If we've subtracted all necessary quantity, move to next product
            if (remainingQuantityToSubtract === 0) break;
          }
        }

        // Check if we couldn't subtract all quantities
        if (remainingQuantityToSubtract > 0) {
          console.log('Warning: Could not subtract all quantities');
          productProcessingDetails.unsubtractedQuantity = remainingQuantityToSubtract;
          productProcessingDetails.fullyProcessed = false;
          brandProcessingDetails.products.push(productProcessingDetails);
        } else {
          productProcessingDetails.fullyProcessed = true;
          brandProcessingDetails.products.push(productProcessingDetails);
        }
      }

      processingDetails.push(brandProcessingDetails);
    }

    // Check for any unprocessed quantities
    const hasUnprocessedQuantities = processingDetails.some(
      brand => brand.products.some(
        product => product.unsubtractedQuantity > 0
      )
    );

    if (hasUnprocessedQuantities) {
      console.log('Partial processing detected');
      return res.status(400).json({
        success: false,
        message: 'Unable to delete all consumed quantities',
        processingDetails: processingDetails
      });
    }

    // Delete the consumed product record
    const deletionResult = await ConsumedProduct.findByIdAndDelete(consumedProductId);
    
    console.log('Consumed Product Deletion:', {
      deletedId: deletionResult?._id,
      success: !!deletionResult
    });

    return res.status(200).json({
      success: true,
      message: 'Consumed product deleted and delivery records updated successfully',
      processingDetails: processingDetails
    });

  } catch (error) {
    console.error('Error in DeleteConsumedProduct:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};




// const getConsumedProductById = async (req, res) => {   
//   try {
//     // Check if an ID is provided in the request parameters
//     const productId = req.params.id;
    
//     // Validate MongoDB ObjectId if an ID is provided
//     let query = {};
//     if (productId) {
//       if (!mongoose.Types.ObjectId.isValid(productId)) {
//         return res.status(400).json({
//           status: 'error',
//           message: 'Invalid Consumed Product ID'
//         });
//       }
//       query._id = productId;
//     }
    
//     // Fetch consumed products with full population of references
//     const consumedProducts = await ConsumedProduct.find(query)
//       .populate({
//         path: 'employeeId',
//         select: 'fullName email'
//       })
//       .populate({
//         path: 'productDetails.brandId',
//         model: 'Brand',
//         populate: {
//           path: 'products'  // Populate all product details in the brand
//         }
//       })
//       .lean();
    
//     // Transform data to extract full product details
//     const formattedProducts = consumedProducts.map(product => {
//       // Use a Set to track unique brands
//       const uniqueBrands = new Map();
      
//       const productDetails = product.productDetails.flatMap(brandDetail => {
//         // Get the full brand information
//         const brandInfo = brandDetail.brandId;
        
//         // Ensure brand is added only once
//         if (!uniqueBrands.has(brandInfo._id.toString())) {
//           uniqueBrands.set(brandInfo._id.toString(), {
//             brandId: brandInfo._id,
//             brandName: brandInfo.brandName
//           });
//         }
        
//         // Map consumed products to their full details
//         return brandDetail.products.map(consumedProduct => {
//           // Find the full product details from the brand
//           const fullProductDetails = brandInfo.products.find(
//             p => p.productId.toString() === consumedProduct.productId.toString()
//           );
          
//           return {
//             brandId: brandInfo._id,
//             brandName: brandInfo.brandName,
//             consumedQuantity: consumedProduct.consumedQuantity,
//             productDetails: fullProductDetails || {
//               productId: consumedProduct.productId,
//               name: 'Unknown Product',
//               image: null,
//               noExpiry: false,
//               expiry_date: null
//             }
//           };
//         });
//       });
      
//       return {
//         _id: product._id,
//         employeeId: product.employeeId,
//         date: product.date,
//         totalConsumedQuantity: productDetails.reduce((total, product) =>
//           total + product.consumedQuantity, 0
//         ),
//         brands: Array.from(uniqueBrands.values()),
//         productDetails: productDetails
//       };
//     });
    
//     // Fetch product deliveries by brand ID
//     const brandIds = formattedProducts.flatMap(product => 
//       product.brands.map(brand => brand.brandId)
//     );
    
//     const productDeliveries = await ProductDelivery.find({
//       brandId: { $in: brandIds }
//     })
//     .populate({
//       path: 'employeeId',
//       select: 'fullName email'
//     })

//     .lean();
    


//     // Aggregate product deliveries by brand and product
// const aggregatedDeliveries = productDeliveries.reduce((acc, delivery) => {
//   delivery.products.forEach(product => {
//     // Create unique key for brand and product combination
//     const key = `${delivery.brandId}_${product.productId._id}`;
    
//     // Initialize if not exists
//     if (!acc[key]) {
//       acc[key] = {
//         brandId: delivery.brandId,
//         productId: product.productId._id,
//         productName: product.productId.name,
//         totalQuantity: 0,
//         deliveryCount: 0,
//         consumptionStatus: 0
//       };
//     }
    
//     // Aggregate quantities
//     acc[key].totalQuantity += product.quantity;
//     acc[key].deliveryCount++;
    
//     // Extract numeric part of consumption status and add
//     let numericStatus = 0;
//     if (product.consumptionStatus) {
//       // Handle string format like '2_consumed'
//       if (typeof product.consumptionStatus === 'string') {
//         const statusMatch = product.consumptionStatus.match(/^(\d+)_consumed$/);
//         if (statusMatch) {
//           numericStatus = parseInt(statusMatch[1], 10);
//         }
//       } 
//       // Handle numeric format
//       else if (typeof product.consumptionStatus === 'number') {
//         numericStatus = product.consumptionStatus;
//       }
//     }
    
//     acc[key].consumptionStatus += numericStatus;
    
//     return acc;
//   });
  
//   return acc;
// }, {});

// // Convert aggregated deliveries to array and format consumption status
// const formattedDeliveries = Object.values(aggregatedDeliveries).map(delivery => {
//   // Ensure consumptionStatus is a number
//   const consumedQuantity = typeof delivery.consumptionStatus === 'number' 
//     ? delivery.consumptionStatus 
//     : 0;
  
//   return {
//     ...delivery,
//     consumptionStatus: `${consumedQuantity}_consumed`,
//     remainingQuantity: delivery.totalQuantity - consumedQuantity
//   };
// });

    
//     // Combine consumed products with product deliveries
//     const responseData = {
//       consumedProducts: productId ? formattedProducts[0] : formattedProducts,
//       productDeliveries: formattedDeliveries
//     };
    
//     // Handle case when no product is found
//     if (productId && formattedProducts.length === 0) {
//       return res.status(404).json({
//         status: 'error',
//         message: 'Consumed Product not found'
//       });
//     }
    
//     res.status(200).json({
//       status: 'success',
//       results: {
//         consumedProducts: formattedProducts.length,
//         productDeliveries: formattedDeliveries.length
//       },
//       data: responseData
//     });
//   } catch (error) {
//     console.error('Error in getAllConsumedProducts:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Failed to fetch consumed products',
//       error: error.message
//     });
//   } 
// };

const getConsumedProductById = async (req, res) => {   
  try {
    // Check if an ID is provided in the request parameters
    const productId = req.params.id;
    
    // Validate MongoDB ObjectId if an ID is provided
    let query = {};
    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid Consumed Product ID'
        });
      }
      query._id = productId;
    }
    
    // Fetch consumed products with full population of references
    const consumedProducts = await ConsumedProduct.find(query)
      .populate({
        path: 'employeeId',
        select: 'fullName email'
      })
      .populate({
        path: 'productDetails.brandId',
        model: 'Brand',
        populate: {
          path: 'products'  // Populate all product details in the brand
        }
      })
      .lean();
    
    // Fetch product deliveries by brand ID
    const brandIds = consumedProducts.flatMap(product => 
      product.productDetails.map(detail => detail.brandId)
    );
    
    const productDeliveries = await ProductDelivery.find({
      brandId: { $in: brandIds }
    })
    .populate({
      path: 'employeeId',
      select: 'fullName email'
    })
    .lean();

    // Aggregate product deliveries by brand and product
    const aggregatedDeliveries = productDeliveries.reduce((acc, delivery) => {
      delivery.products.forEach(product => {
        // Create unique key for brand and product combination
        const key = `${delivery.brandId}_${product.productId._id}`;
        
        // Initialize if not exists
        if (!acc[key]) {
          acc[key] = {
            brandId: delivery.brandId,
            productId: product.productId._id,
            productName: product.productId.name,
            totalQuantity: 0,
            deliveryCount: 0,
            consumedQuantity: 0
          };
        }
        
        // Aggregate quantities
        acc[key].totalQuantity += product.quantity;
        acc[key].deliveryCount++;
        
        // Extract consumed quantity
        let consumedQuantity = 0;
        if (product.consumptionStatus) {
          // Handle string format like '2_consumed'
          if (typeof product.consumptionStatus === 'string') {
            const statusMatch = product.consumptionStatus.match(/^(\d+)_consumed$/);
            if (statusMatch) {
              consumedQuantity = parseInt(statusMatch[1], 10);
            }
          } 
          // Handle numeric format
          else if (typeof product.consumptionStatus === 'number') {
            consumedQuantity = product.consumptionStatus;
          }
        }
        
        acc[key].consumedQuantity += consumedQuantity;
        
        return acc;
      });
      
      return acc;
    }, {});

    // Transform data to extract full product details
    const formattedProducts = consumedProducts.map(product => {
      // Use a Set to track unique brands
      const uniqueBrands = new Map();
      
      const productDetails = product.productDetails.flatMap(brandDetail => {
        // Get the full brand information
        const brandInfo = brandDetail.brandId;
        
        // Ensure brand is added only once
        if (!uniqueBrands.has(brandInfo._id.toString())) {
          uniqueBrands.set(brandInfo._id.toString(), {
            brandId: brandInfo._id,
            brandName: brandInfo.brandName
          });
        }
        
        // Map consumed products to their full details
        return brandDetail.products.map(consumedProduct => {
          // Find the full product details from the brand
          const fullProductDetails = brandInfo.products.find(
            p => p.productId.toString() === consumedProduct.productId.toString()
          );
          
          // Find corresponding delivery details
          const deliveryKey = `${brandInfo._id}_${consumedProduct.productId}`;
          const deliveryDetails = aggregatedDeliveries[deliveryKey] || {
            totalQuantity: 0,
            deliveryCount: 0,
            consumedQuantity: 0
          };
          
          // Calculate remaining quantity
          const remainingQuantity = deliveryDetails.totalQuantity - deliveryDetails.consumedQuantity;
          
          return {
            brandId: brandInfo._id,
            brandName: brandInfo.brandName,
            consumedQuantity: consumedProduct.consumedQuantity,
            productDetails: {
              ...fullProductDetails || {
                productId: consumedProduct.productId,
                name: 'Unknown Product',
                image: null,
                noExpiry: false,
                expiry_date: null
              },
              // Add delivery details to product details
              totalDeliveredQuantity: deliveryDetails.totalQuantity,
              deliveryCount: deliveryDetails.deliveryCount,
              consumptionStatus: deliveryDetails.consumedQuantity,
              remainingQuantity: remainingQuantity,
              // New field: maxAllowedQuantity = consumedQuantity + remainingQuantity
              maxAllowedQuantity: consumedProduct.consumedQuantity + remainingQuantity
            }
          };
        });
      });
      
      return {
        _id: product._id,
        employeeId: product.employeeId,
        date: product.date,
        totalConsumedQuantity: productDetails.reduce((total, product) =>
          total + product.consumedQuantity, 0
        ),
        brands: Array.from(uniqueBrands.values()),
        productDetails: productDetails
      };
    });
    
    // Convert aggregated deliveries to array and format consumption status
    const formattedDeliveries = Object.values(aggregatedDeliveries).map(delivery => ({
      brandId: delivery.brandId,
      productId: delivery.productId,
      totalQuantity: delivery.totalQuantity,
      deliveryCount: delivery.deliveryCount,
      consumptionStatus: `${delivery.consumedQuantity}_consumed`,
      remainingQuantity: delivery.totalQuantity - delivery.consumedQuantity,
      maxAllowedQuantity: delivery.totalQuantity
    }));
    
    // Combine consumed products with product deliveries
    const responseData = {
      consumedProducts: productId ? formattedProducts[0] : formattedProducts,
      productDeliveries: formattedDeliveries
    };
    
    // Handle case when no product is found
    if (productId && formattedProducts.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Consumed Product not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      results: {
        consumedProducts: formattedProducts.length,
        productDeliveries: formattedDeliveries.length
      },
      data: responseData
    });
  } catch (error) {
    console.error('Error in getAllConsumedProducts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch consumed products',
      error: error.message
    });
  } 
};







// const updateConsumedProduct = async (req, res) => {
//   try {
//     const { id } = req.params;

//     console.log('=== UPDATE CONSUMED PRODUCT REQUEST ===');
//     console.log('Request Params ID:', id);
//     console.log('Request Body:', JSON.stringify(req.body, null, 2));

//     const {
//       employeeId,
//       date,
//       productDetails
//     } = req.body;

//     // Validation checks
//     if (!employeeId || !date || !productDetails || !Array.isArray(productDetails) || productDetails.length === 0) {
//       console.log('Validation Failed: Invalid input data');
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid input data'
//       });
//     }

//     // Find the existing consumed product
//     const existingConsumedProduct = await ConsumedProduct.findById(id);
//     console.log('Existing Consumed Product:', JSON.stringify(existingConsumedProduct, null, 2));

//     if (!existingConsumedProduct) {
//       console.log('Consumed Product Record Not Found');
//       return res.status(404).json({
//         success: false,
//         message: 'Consumed product record not found'
//       });
//     }

//     // Store updates for delivery records
//     const deliveryUpdates = [];

//     // Process each brand's product details
//     for (const brandDetail of productDetails) {
//       console.log(`\n--- Processing Brand: ${brandDetail.brandId} ---`);

//       // Find recent delivery records for this brand and employee
//       const recentDeliveries = await ProductDelivery.find({
//         brandId: brandDetail.brandId,
//         employeeId: employeeId,
//         deliveryDate: { $lte: new Date(date) }
//       }).sort({ deliveryDate: -1 });

//       console.log('Recent Deliveries Found:', recentDeliveries.length);
//       console.log('Recent Deliveries Details:', JSON.stringify(recentDeliveries, null, 2));

//       // Process products for this brand
//       for (const productItem of brandDetail.products) {
//         console.log(`\n--- Processing Product: ${productItem.productId} ---`);
//         console.log('Quantity Change:', productItem.quantityChange);

//         // Skip if quantity change is 0
//         if (productItem.quantityChange === 0) {
//           console.log('Skipping product - No quantity change');
//           continue;
//         }

//         // Find matching delivery record with the product
//         const matchingDelivery = recentDeliveries.find(delivery => 
//           delivery.products.some(p => 
//             p.productId.toString() === productItem.productId.toString() && 
//             p.consumptionStatus !== 'fully_consumed'
//           )
//         );

//         console.log('Matching Delivery Found:', !!matchingDelivery);
//         if (matchingDelivery) {
//           console.log('Matching Delivery ID:', matchingDelivery._id);

//           // Find the specific product in the delivery
//           const productToUpdate = matchingDelivery.products.find(p => 
//             p.productId.toString() === productItem.productId.toString()
//           );

//           if (productToUpdate) {
//             console.log('Product to Update:', JSON.stringify(productToUpdate, null, 2));

//             // Parse current consumption status
//             const currentStatus = productToUpdate.consumptionStatus || '0_consumed';
//             const [currentConsumed] = currentStatus.split('_');
//             console.log('Current Consumption Status:', currentStatus);

//             let newConsumedTotal = parseInt(currentConsumed) + productItem.quantityChange;
//             console.log('Calculated New Consumed Total:', newConsumedTotal);

//             // Ensure newConsumedTotal doesn't go negative
//             newConsumedTotal = Math.max(0, newConsumedTotal);
//             console.log('Adjusted New Consumed Total:', newConsumedTotal);

//             // Determine new consumption status
//             let newStatus = `${newConsumedTotal}_consumed`;
//             if (newConsumedTotal >= productToUpdate.quantity) {
//               newStatus = 'fully_consumed';
//             }
//             console.log('New Consumption Status:', newStatus);

//             // Update product consumption status
//             const updateResult = await ProductDelivery.updateOne(
//               { 
//                 _id: matchingDelivery._id, 
//                 'products.productId': productToUpdate.productId 
//               },
//               { 
//                 $set: { 
//                   'products.$.consumptionStatus': newStatus 
//                 } 
//               }
//             );

//             console.log('Update Result:', JSON.stringify(updateResult, null, 2));

//             // Add to updates for response
//             deliveryUpdates.push({
//               deliveryId: matchingDelivery._id,
//               productId: productToUpdate.productId,
//               newStatus: newStatus
//             });
//           }
//         }
//       }
//     }

//     console.log('\n--- Preparing Consumed Product Update ---');
//     // Update consumed product record
//     existingConsumedProduct.employeeId = employeeId;
//     existingConsumedProduct.date = date;
//     existingConsumedProduct.productDetails = productDetails.map(detail => ({
//       brandId: detail.brandId,
//       products: detail.products.map(product => ({
//         productId: product.productId,
//         consumedQuantity: product.consumedQuantity
//       })),
//       _id: detail._id || new mongoose.Types.ObjectId()
//     }));
//     existingConsumedProduct.updatedAt = new Date();

//     console.log('Updated Consumed Product:', JSON.stringify(existingConsumedProduct, null, 2));

//     // Save the updated consumed product
//     const updatedConsumedProduct = await existingConsumedProduct.save();
//     console.log('Saved Updated Consumed Product:', JSON.stringify(updatedConsumedProduct, null, 2));

//     // Prepare response
//     const responseData = {
//       _id: updatedConsumedProduct._id,
//       employeeId: updatedConsumedProduct.employeeId,
//       date: updatedConsumedProduct.date,
//       productDetails: updatedConsumedProduct.productDetails,
//       deliveryUpdates: deliveryUpdates
//     };

//     console.log('\n=== FINAL RESPONSE ===');
//     console.log(JSON.stringify(responseData, null, 2));

//     // Respond with updated data
//     res.status(200).json(responseData);

//   } catch (error) {
//     console.error('=== ERROR IN UPDATE CONSUMED PRODUCT ===');
//     console.error('Full Error Object:', error);
//     console.error('Error Message:', error.message);
//     console.error('Error Stack:', error.stack);

//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };



// const updateConsumedProduct = async (req, res) => {
//   try {
//     const { id } = req.params;

//     console.log('=== UPDATE CONSUMED PRODUCT REQUEST ===');
//     console.log('Request Params ID:', id);
//     console.log('Request Body:', JSON.stringify(req.body, null, 2));

//     const {
//       employeeId,
//       date,
//       productDetails
//     } = req.body;

//     // Validation checks
//     if (!employeeId || !date || !productDetails || !Array.isArray(productDetails) || productDetails.length === 0) {
//       console.log('Validation Failed: Invalid input data');
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid input data'
//       });
//     }

//     // Find the existing consumed product
//     const existingConsumedProduct = await ConsumedProduct.findById(id);
//     console.log('Existing Consumed Product:', JSON.stringify(existingConsumedProduct, null, 2));

//     if (!existingConsumedProduct) {
//       console.log('Consumed Product Record Not Found');
//       return res.status(404).json({
//         success: false,
//         message: 'Consumed product record not found'
//       });
//     }

//     // Store updates for delivery records
//     const deliveryUpdates = [];

//     // Process each brand's product details
//     for (const brandDetail of productDetails) {
//       console.log(`\n--- Processing Brand: ${brandDetail.brandId} ---`);

//       // Find all delivery records for this brand and employee
//       const allDeliveries = await ProductDelivery.find({
//         brandId: brandDetail.brandId,
//         deliveryDate: { 
          
//           $lte: new Date(new Date(date).setHours(23, 59, 59, 999)) // End of the day
//         }
//       }).sort({ deliveryDate: -1 });

//       console.log('All Deliveries Found:', allDeliveries.length);
//       console.log('All Deliveries Details:', JSON.stringify(allDeliveries, null, 2));

//       // Process products for this brand
//       for (const productItem of brandDetail.products) {
//         console.log(`\n--- Processing Product: ${productItem.productId} ---`);
//         console.log('Quantity Change:', productItem.quantityChange);

//         // Skip if quantity change is 0
//         if (productItem.quantityChange === 0) {
//           console.log('Skipping product - No quantity change');
//           continue;
//         }

//         // Find deliveries with this product that are not fully consumed and not 0_consumed
//         const availableDeliveries = allDeliveries.filter(delivery => 
//           delivery.products.some(p => 
//             p.productId.toString() === productItem.productId.toString() && 
//             p.consumptionStatus !== 'fully_consumed' &&
//             p.consumptionStatus !== '0_consumed'
//           )
//         );

//         // If no available deliveries, check for 0_consumed deliveries
//         const zeroConsumedDeliveries = availableDeliveries.length === 0 
//           ? allDeliveries.filter(delivery => 
//               delivery.products.some(p => 
//                 p.productId.toString() === productItem.productId.toString() && 
//                 p.consumptionStatus === '0_consumed'
//               )
//             )
//           : [];

//         // Combine available deliveries, prioritizing non-zero consumed first
//         const processDeliveries = [...availableDeliveries, ...zeroConsumedDeliveries];

//         // If no deliveries found, skip this product
//         if (processDeliveries.length === 0) {
//           console.log('No available deliveries for this product');
//           continue;
//         }

//         // Select the most recent delivery with remaining consumption
//         const matchingDelivery = processDeliveries[0];

//         console.log('Matching Delivery Found:', !!matchingDelivery);
//         if (matchingDelivery) {
//           console.log('Matching Delivery ID:', matchingDelivery._id);

//           // Find the specific product in the delivery
//           const productToUpdate = matchingDelivery.products.find(p => 
//             p.productId.toString() === productItem.productId.toString() && 
//             (p.consumptionStatus !== 'fully_consumed' || p.consumptionStatus === '0_consumed')
//           );

//           if (productToUpdate) {
//             console.log('Product to Update:', JSON.stringify(productToUpdate, null, 2));

//             // Parse current consumption status
//             const currentStatus = productToUpdate.consumptionStatus || '0_consumed';
//             const [currentConsumed] = currentStatus.split('_');
//             console.log('Current Consumption Status:', currentStatus);

//             let newConsumedTotal = parseInt(currentConsumed) + productItem.quantityChange;
//             console.log('Calculated New Consumed Total:', newConsumedTotal);

//             // Ensure newConsumedTotal doesn't go negative
//             newConsumedTotal = Math.max(0, newConsumedTotal);
//             console.log('Adjusted New Consumed Total:', newConsumedTotal);

//             // Determine new consumption status
//             let newStatus = `${newConsumedTotal}_consumed`;

//             console.log('New Consumption Status:', newStatus);

//             // Update product consumption status
//             const updateResult = await ProductDelivery.updateOne(
//               { 
//                 _id: matchingDelivery._id, 
//                 'products.productId': productToUpdate.productId 
//               },
//               { 
//                 $set: { 
//                   'products.$.consumptionStatus': newStatus 
//                 } 
//               }
//             );

//             console.log('Update Result:', JSON.stringify(updateResult, null, 2));

//             // Add to updates for response
//             deliveryUpdates.push({
//               deliveryId: matchingDelivery._id,
//               productId: productToUpdate.productId,
//               newStatus: newStatus
//             });
//           }
//         }
//       }
//     }

//     console.log('\n--- Preparing Consumed Product Update ---');
//     // Update consumed product record
//     existingConsumedProduct.employeeId = employeeId;
//     existingConsumedProduct.date = date;
//     existingConsumedProduct.productDetails = productDetails.map(detail => ({
//       brandId: detail.brandId,
//       products: detail.products.map(product => ({
//         productId: product.productId,
//         consumedQuantity: product.consumedQuantity
//       })),
//       _id: detail._id || new mongoose.Types.ObjectId()
//     }));
//     existingConsumedProduct.updatedAt = new Date();

//     console.log('Updated Consumed Product:', JSON.stringify(existingConsumedProduct, null, 2));

//     // Save the updated consumed product
//     const updatedConsumedProduct = await existingConsumedProduct.save();
//     console.log('Saved Updated Consumed Product:', JSON.stringify(updatedConsumedProduct, null, 2));

//     // Prepare response
//     const responseData = {
//       _id: updatedConsumedProduct._id,
//       employeeId: updatedConsumedProduct.employeeId,
//       date: updatedConsumedProduct.date,
//       productDetails: updatedConsumedProduct.productDetails,
//       deliveryUpdates: deliveryUpdates
//     };

//     console.log('\n=== FINAL RESPONSE ===');
//     console.log(JSON.stringify(responseData, null, 2));

//     // Respond with updated data
//     res.status(200).json(responseData);

//   } catch (error) {
//     console.error('=== ERROR IN UPDATE CONSUMED PRODUCT ===');
//     console.error('Full Error Object:', error);
//     console.error('Error Message:', error.message);
//     console.error('Error Stack:', error.stack);

//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };

const updateConsumedProduct = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('=== UPDATE CONSUMED PRODUCT REQUEST ===');
    console.log('Request Params ID:', id);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));

    const { employeeId, date, productDetails } = req.body;

    // Validation checks
    if (!employeeId || !date || !productDetails || !Array.isArray(productDetails) || productDetails.length === 0) {
      console.log('Validation Failed: Invalid input data');
      return res.status(400).json({
        success: false,
        message: 'Invalid input data'
      });
    }

    // Find the existing consumed product
    const existingConsumedProduct = await ConsumedProduct.findById(id);
    console.log('Existing Consumed Product:', JSON.stringify(existingConsumedProduct, null, 2));

    if (!existingConsumedProduct) {
      console.log('Consumed Product Record Not Found');
      return res.status(404).json({
        success: false,
        message: 'Consumed product record not found'
      });
    }

    // Store updates for delivery records
    const deliveryUpdates = [];

    // Process each brand's product details
    for (const brandDetail of productDetails) {
      console.log(`\n--- Processing Brand: ${brandDetail.brandId} ---`);

      // Find all delivery records for this brand and employee
      const allDeliveries = await ProductDelivery.find({
        brandId: brandDetail.brandId,
        deliveryDate: { 
          $lte: new Date(new Date(date).setHours(23, 59, 59, 999))
        }
      }).sort({ deliveryDate: -1 });

      console.log('All Deliveries Found:', allDeliveries.length);

      // Process products for this brand
      for (const productItem of brandDetail.products) {
        console.log(`\n--- Processing Product: ${productItem.productId} ---`);
        console.log('Quantity Change:', productItem.quantityChange);

        // Skip if quantity change is 0
        if (productItem.quantityChange === 0) {
          console.log('Skipping product - No quantity change');
          continue;
        }

        // Determine if we're increasing or decreasing quantity
        const isIncreasing = productItem.quantityChange > 0;
        console.log(`Operation type: ${isIncreasing ? 'Increasing' : 'Decreasing'} quantity`);

        let remainingQuantityToUpdate = productItem.quantityChange;
        console.log('Initial remaining quantity to update:', remainingQuantityToUpdate);

        // Process multiple deliveries if needed
        for (const delivery of allDeliveries) {
          console.log(`\nChecking delivery: ${delivery._id}`);
          
          const productInDelivery = delivery.products.find(p => 
            p.productId.toString() === productItem.productId.toString()
          );

          if (!productInDelivery) {
            console.log('Product not found in this delivery, skipping...');
            continue;
          }

          // Get current consumption status
          const currentStatus = productInDelivery.consumptionStatus || '0_consumed';
          const [currentConsumed] = currentStatus.split('_');
          const currentConsumedQty = parseInt(currentConsumed) || 0;
          
          console.log('Delivery Status:', {
            deliveryId: delivery._id,
            quantity: productInDelivery.quantity,
            currentConsumed: currentConsumedQty,
            status: currentStatus
          });

          // Skip logic only applies when increasing quantity
          if (isIncreasing && currentConsumedQty >= productInDelivery.quantity) {
            console.log('Delivery already fully consumed, moving to next delivery (Skip logic for increase)');
            continue;
          }

          // For decreasing quantity, we don't skip fully consumed deliveries
          if (!isIncreasing) {
            console.log('Decrease operation - processing delivery regardless of consumption status');
          }

          // Calculate how much can be updated in this delivery
          let quantityToUpdate;
          if (isIncreasing) {
            const availableSpace = productInDelivery.quantity - currentConsumedQty;
            quantityToUpdate = Math.min(remainingQuantityToUpdate, availableSpace);
          } else {
            // For decrease, we can update up to the current consumed quantity
            quantityToUpdate = Math.max(
              remainingQuantityToUpdate, 
              -currentConsumedQty
            );
          }

          if (Math.abs(quantityToUpdate) > 0) {
            const newConsumedTotal = Math.max(0, currentConsumedQty + quantityToUpdate);
            const newStatus = `${newConsumedTotal}_consumed`;

            console.log('Updating delivery:', {
              deliveryId: delivery._id,
              quantityToUpdate,
              newTotal: newConsumedTotal,
              newStatus
            });

            // Update product consumption status
            const updateResult = await ProductDelivery.updateOne(
              { 
                _id: delivery._id, 
                'products.productId': productInDelivery.productId 
              },
              { 
                $set: { 
                  'products.$.consumptionStatus': newStatus 
                } 
              }
            );

            console.log('Update Result:', JSON.stringify(updateResult, null, 2));

            // Add to updates for response
            deliveryUpdates.push({
              deliveryId: delivery._id,
              productId: productInDelivery.productId,
              newStatus: newStatus,
              updatedQuantity: quantityToUpdate
            });

            // Update remaining quantity
            remainingQuantityToUpdate -= quantityToUpdate;
            console.log('Remaining quantity to update:', remainingQuantityToUpdate);

            // Break if no more quantity to update
            if (
              (isIncreasing && remainingQuantityToUpdate <= 0) ||
              (!isIncreasing && remainingQuantityToUpdate >= 0)
            ) {
              console.log('All quantity updated, moving to next product');
              break;
            }
          }
        }

        // Check if we couldn't update all quantity (only for increase operations)
        if (isIncreasing && remainingQuantityToUpdate > 0) {
          console.log('Warning: Could not update all quantity. Remaining:', remainingQuantityToUpdate);
          throw new Error(`Insufficient available quantity for product ${productItem.productId}. Unable to update ${remainingQuantityToUpdate} units.`);
        }
      }
    }

    console.log('\n--- Preparing Consumed Product Update ---');
    // Update consumed product record
    existingConsumedProduct.employeeId = employeeId;
    existingConsumedProduct.date = date;
    existingConsumedProduct.productDetails = productDetails.map(detail => ({
      brandId: detail.brandId,
      products: detail.products.map(product => ({
        productId: product.productId,
        consumedQuantity: product.consumedQuantity
      })),
      _id: detail._id || new mongoose.Types.ObjectId()
    }));
    existingConsumedProduct.updatedAt = new Date();

    // Save the updated consumed product
    const updatedConsumedProduct = await existingConsumedProduct.save();
    console.log('Saved Updated Consumed Product');

    // Prepare response
    const responseData = {
      _id: updatedConsumedProduct._id,
      employeeId: updatedConsumedProduct.employeeId,
      date: updatedConsumedProduct.date,
      productDetails: updatedConsumedProduct.productDetails,
      deliveryUpdates: deliveryUpdates
    };

    console.log('\n=== FINAL RESPONSE ===');
    console.log(JSON.stringify(responseData, null, 2));

    res.status(200).json(responseData);

  } catch (error) {
    console.error('=== ERROR IN UPDATE CONSUMED PRODUCT ===');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

module.exports= {
  getAllProductDeliveries,
  CreateConsumedProduct,
  getAllConsumedProducts,
  DeleteConsumedProduct,
  getConsumedProductById,
  updateConsumedProduct
};