const moment = require('moment-timezone');
const Brand = require('../models/Brand');
const User = require('../models/User');


const Platform = require('../models/Platform');

const mongoose = require('mongoose');

const upload = require('../config/multer');
const ProductOrder = require('../models/productOrder');
const ProductDelivery = require('../models/ProductDelivery');
const ConsumedProduct = require('../models/ConsumedProduct');

const createBrand = async (req, res) => {
  const uploadedFiles = [];
  
  try {
    console.log('Received request body:', req.body);
    console.log('Received files:', req.files);
    
    const { brandName, clientId } = req.body;
    
    // Handle employees array properly
    let employees = req.body.employees;
    if (!Array.isArray(employees)) {
      employees = [employees].filter(Boolean);
    }
    
    // Validate required fields
    if (!brandName) {
      throw new Error('Brand name is required');
    }
    
    // Validate clientId
    if (!clientId) {
      throw new Error('Client ID is required');
    }

    // Validate client exists and has correct role
    const client = await User.findOne({ _id: clientId, role: 'client' });
    if (!client) {
      throw new Error('Invalid client ID');
    }
    
    // Validate employees array
    if (!employees || employees.length === 0) {
      throw new Error('At least one employee is required');
    }
    
    // Process products
    const products = [];
    
    // Check if products data exists in the form
    if (!req.body['products[0][name]'] && !req.body.products) {
      throw new Error('At least one product is required');
    }
    
    // Determine if we're dealing with a flattened form structure or JSON
    const isFlattened = req.body['products[0][name]'] !== undefined;
    
    if (isFlattened) {
      // Handle flattened form structure (created from FormData)
      const productIndices = new Set();
      
      // Find all product indices from the request body keys
      Object.keys(req.body).forEach(key => {
        const match = key.match(/products\[(\d+)\]/);
        if (match) {
          productIndices.add(parseInt(match[1]));
        }
      });
      
      // Process each product
      for (const index of productIndices) {
        const name = req.body[`products[${index}][name]`];
        const unit = req.body[`products[${index}][unit]`];
        const productUrl = req.body[`products[${index}][productUrl]`]; // Get productUrl
        const noExpiry = req.body[`products[${index}][noExpiry]`] === 'true';
        const expiry_date = req.body[`products[${index}][expiry_date]`] || null;
        
        // Find corresponding image in req.files
        const productImage = req.files.find(file => 
          file.fieldname === `products[${index}][image]`
        );
        
        if (!name) {
          throw new Error(`Product ${index + 1} name is required`);
        }
        
        if (!unit) {
          throw new Error(`Product ${index + 1} unit is required`);
        }
        
        if (!productImage) {
          throw new Error(`Product ${index + 1} image is required`);
        }
        
        // Keep track of uploaded file
        uploadedFiles.push(productImage.path);
        
        products.push({
          productId: new mongoose.Types.ObjectId(),
          name,
          unit,
          productUrl, // Add productUrl to the product object
          image: `/uploads/products/${productImage.filename}`,
          noExpiry,
          expiry_date: expiry_date ? new Date(expiry_date) : null
        });
      }
    } else {
      // Handle JSON structure (unlikely with FormData but included for completeness)
      let productsData = [];
      
      // Parse products data
      if (req.body.products) {
        if (typeof req.body.products === 'string') {
          productsData = [JSON.parse(req.body.products)];
        } else if (Array.isArray(req.body.products)) {
          productsData = req.body.products;
        } else {
          productsData = [req.body.products];
        }
      }
      
      // Process each product
      for (let i = 0; i < productsData.length; i++) {
        const product = productsData[i];
        
        // Find corresponding image in req.files
        const productImage = req.files.find(file => 
          file.fieldname === `products[${i}][image]`
        );
        
        if (!product.name) {
          throw new Error(`Product ${i + 1} name is required`);
        }
        
        if (!product.unit) {
          throw new Error(`Product ${i + 1} unit is required`);
        }
        
        if (!productImage) {
          throw new Error(`Product ${i + 1} image is required`);
        }
        
        // Keep track of uploaded file
        uploadedFiles.push(productImage.path);
        
        let expiry_date = null;
        if (product.expiry_date) {
          expiry_date = new Date(product.expiry_date);
        }
        
        products.push({
          productId: new mongoose.Types.ObjectId(),
          name: product.name,
          productUrl: product.productUrl, // Add productUrl to the product
          unit: product.unit,
          image: `/uploads/products/${productImage.filename}`,
          noExpiry: product.noExpiry === 'true',
          expiry_date
        });
      }
    }
    
    // Validate we have at least one product
    if (products.length === 0) {
      throw new Error('At least one product is required');
    }
    
    // Validate employees (vendors)
    const vendors = await User.find({
      _id: { $in: employees },
      role: 'Employee'
    });
    
    if (vendors.length !== employees.length) {
      throw new Error('One or more selected vendors are invalid');
    }
    
    // Create and save the brand
    const newBrand = new Brand({
      brandName,
      clientId, // Save client ID reference
      employees,
      products
    });
    
    await newBrand.save();
    
    const populatedBrand = await Brand.findById(newBrand._id)
      .populate('employees', 'name email')
      .populate('clientId', 'name email'); // Also populate client information
    
    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: populatedBrand
    });
  } catch (error) {
    // Clean up uploaded files if there's an error
    for (const filePath of uploadedFiles) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error(`Error deleting file ${filePath}:`, err);
      }
    }
    
    console.error('Brand creation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating brand'
    });
  }
};

// const createBrand = async (req, res) => {
//   const uploadedFiles = [];
  
//   try {
//     console.log('Received request body:', req.body);
//     console.log('Received files:', req.files);
    
//     const { brandName } = req.body;
    
//     // Handle employees array properly
//     let employees = req.body.employees;
//     if (!Array.isArray(employees)) {
//       employees = [employees].filter(Boolean);
//     }
    
//     // Validate required fields
//     if (!brandName) {
//       throw new Error('Brand name is required');
//     }
    
//     // Validate employees array
//     if (!employees || employees.length === 0) {
//       throw new Error('At least one employee is required');
//     }
    
//     // Process products
//     const products = [];
//     let productsData = [];
    
//     // Parse products data
//     if (req.body.products) {
//       if (typeof req.body.products === 'string') {
//         productsData = [JSON.parse(req.body.products)];
//       } else if (Array.isArray(req.body.products)) {
//         productsData = req.body.products;
//       } else {
//         productsData = [req.body.products];
//       }
//     }
    
//     // Process each product
//     for (let i = 0; i < productsData.length; i++) {
//       const product = productsData[i];
      
//       // Find corresponding image in req.files
//       const productImage = req.files.find(file =>
//         file.fieldname === `products[${i}][image]`
//       );
      
//       if (!product.name) {
//         throw new Error(`Product ${i + 1} name is required`);
//       }
      
//       if (!product.unit) {
//         throw new Error(`Product ${i + 1} unit is required`);
//       }
      
//       if (!productImage) {
//         throw new Error(`Product ${i + 1} image is required`);
//       }
      
//       // Keep track of uploaded file
//       uploadedFiles.push(productImage.path);
      
//       let expiry_date = null;
//       if (product.expiry_date) {
//         expiry_date = new Date(product.expiry_date);
//       }
      
//       products.push({
//         productId: new mongoose.Types.ObjectId(),
//         name: product.name,
//         unit: product.unit, // Add unit field
//         image: `/uploads/products/${productImage.filename}`,
//         noExpiry: product.noExpiry === 'true',
//         expiry_date
//       });
//     }
    
//     // Validate we have at least one product
//     if (products.length === 0) {
//       throw new Error('At least one product is required');
//     }
    
//     // Validate employees (vendors)
//     const vendors = await User.find({
//       _id: { $in: employees },
//       role: 'Employee'
//     });
    
//     if (vendors.length !== employees.length) {
//       throw new Error('One or more selected vendors are invalid');
//     }
    
//     // Create and save the brand
//     const newBrand = new Brand({
//       brandName,
//       employees,
//       products
//     });
    
//     await newBrand.save();
    
//     const populatedBrand = await Brand.findById(newBrand._id)
//       .populate('employees', 'name email');
    
//     res.status(201).json({
//       success: true,
//       message: 'Brand created successfully',
//       data: populatedBrand
//     });
//   } catch (error) {
//     // Clean up uploaded files if there's an error
//     for (const filePath of uploadedFiles) {
//       try {
//         await fs.unlink(filePath);
//       } catch (err) {
//         console.error(`Error deleting file ${filePath}:`, err);
//       }
//     }
    
//     console.error('Brand creation error:', error);
//     res.status(400).json({
//       success: false,
//       message: error.message || 'Error creating brand'
//     });
//   }
// };



  const GetAllInventoryList = async(req,res)=>{
    try{
      const inventoryList = await Brand.find()
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
        message: 'Inventory list retrieved successfully',
        data: inventoryList
        });
        }catch(error){
          console.error('Error retrieving inventory list:', error);
          res.status(400).json({
            success: false,
            message: error.message || 'Error retrieving inventory list'
            });
            }
            
  };

const GetInventoryByEmployeeId = async (req, res) => {
  try {
    // Get employeeId from the URL parameter
    const employeeId = req.params.employeeId || req.params.id;
    
    console.log('Employee ID from params:', employeeId); // Debug log
    
    // Validate if employeeId is provided
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    // Find all brands where the employees array contains the given employeeId
    const inventoryList = await Brand.find({
      employees: employeeId // This will match if employeeId exists in employees array
    })
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
      message: `Inventory list for employee retrieved successfully`,
      data: inventoryList,
      count: inventoryList.length
    });

  } catch (error) {
    console.error('Error retrieving inventory list by employee:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error retrieving inventory list by employee'
    });
  }
};



  const GetInventoryListbyId = async(req,res)=>{
    try {
      const { id } = req.params; // Get brand ID from URL params
  
      // Validate if id is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid brand ID format'
        });
      }
  
      // Find brand and populate employee details
      const brand = await Brand.findById(id)
        .populate({
          path: 'employees',
          select: 'fullName email role' // Include only needed fields
        })
        .lean();
  
      // Check if brand exists
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }
  
      // Return success response
      res.status(200).json({
        success: true,
        data: brand
      });
  
    } catch (error) {
      console.error('Error fetching brand details:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching brand details',
        error: error.message
      });
    }
  };



  const path = require('path');
  const fs = require('fs').promises;
  const fsSync = require('fs');

  const UpdateInventoryListById = async (req, res) => {
  const uploadedFiles = [];

  try {
    // Use any() to handle dynamic number of files
    await new Promise((resolve, reject) => {
      upload.any()(req, res, (err) => {
        if (err) {
          console.error('Upload error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const brandId = req.params.id;
    const { brandName, clientId } = req.body; // Extract clientId from request body

    // Handle employees array properly
    let employees = req.body.employees;
    if (!Array.isArray(employees)) {
      employees = [employees].filter(Boolean);
    }

    // Get the existing brand
    const existingBrand = await Brand.findById(brandId);
    if (!existingBrand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Validate required fields
    if (!brandName) {
      throw new Error('Brand name is required');
    }

    // Validate clientId
    if (!clientId) {
      throw new Error('Client ID is required');
    }

    // Validate employees array
    if (!employees || employees.length === 0) {
      throw new Error('At least one employee is required');
    }

    // Enhanced helper function to clean image URL
    const cleanImageUrl = (url) => {
      if (!url) return null;
      
      // Remove domain part if it exists (including http://localhost:5000)
      const urlWithoutDomain = url.replace(/^https?:\/\/[^\/]+/, '');
      
      // Extract the /uploads/products/filename part
      const match = urlWithoutDomain.match(/\/uploads\/products\/[^?#]+/);
      
      // If we found a match, return it, otherwise return the cleaned url
      return match ? match[0] : urlWithoutDomain;
    };

    // Parse products data
    let productsData;
    try {
      productsData = typeof req.body.products === 'string' 
        ? JSON.parse(req.body.products) 
        : req.body.products;
    } catch (e) {
      console.error('Error parsing products:', e);
      throw new Error('Invalid products data format');
    }

    // Ensure productsData is an array
    productsData = Array.isArray(productsData) ? productsData : [productsData];

    // Process each product
    const products = await Promise.all(productsData.map(async (product, index) => {
      if (!product.name) {
        throw new Error(`Product ${index + 1} name is required`);
      }

      // Added validation for unit field
      if (!product.unit) {
        throw new Error(`Product ${index + 1} unit is required`);
      }

      // Added validation for productUrl field
      if (!product.productUrl) {
        throw new Error(`Product ${index + 1} URL is required`);
      }

      let imageUrl = cleanImageUrl(product.imageUrl);

      const productImage = req.files.find(file => 
        file.fieldname === `products[${index}][image]`
      );

      if (productImage) {
        uploadedFiles.push(productImage.path);

        if (existingBrand.products[index]?.image) {
          const oldImagePath = path.join(
            __dirname, 
            '..', 
            cleanImageUrl(existingBrand.products[index].image)
          );
          
          try {
            if (fsSync.existsSync(oldImagePath)) {
              await fs.unlink(oldImagePath);
            }
          } catch (err) {
            console.error(`Error deleting old image ${oldImagePath}:`, err);
          }
        }

        imageUrl = `/uploads/products/${productImage.filename}`;
      } else if (!imageUrl && existingBrand.products[index]?.image) {
        imageUrl = cleanImageUrl(existingBrand.products[index].image);
      }

      let expiry_date = null;
      if (product.expiry_date && !product.noExpiry) {
        expiry_date = new Date(product.expiry_date);
      }

      const productId = existingBrand.products[index]?.productId || new mongoose.Types.ObjectId();

      return {
        productId,
        name: product.name,
        unit: product.unit,
        image: imageUrl,
        productUrl: product.productUrl, // Add productUrl to the product object
        noExpiry: product.noExpiry === true || product.noExpiry === 'true',
        expiry_date: product.noExpiry ? null : expiry_date
      };
    }));

    if (products.length === 0) {
      throw new Error('At least one product is required');
    }

    const vendors = await User.find({
      _id: { $in: employees },
      role: 'Employee'
    });

    if (vendors.length !== employees.length) {
      throw new Error('One or more selected vendors are invalid');
    }

    // Verify that the clientId exists
    const clientExists = await User.findById(clientId);
    if (!clientExists) {
      throw new Error('Selected client does not exist');
    }

    const updatedBrand = await Brand.findByIdAndUpdate(
      brandId,
      {
        brandName,
        clientId, // Add clientId to the update
        employees,
        products
      },
      { new: true, runValidators: true }
    ).populate('employees', 'name email').populate('clientId', 'name'); // Also populate clientId

    res.json({
      success: true,
      message: 'Brand updated successfully',
      data: updatedBrand
    });

  } catch (error) {
    // Clean up any uploaded files if there's an error
    for (const filePath of uploadedFiles) {
      try {
        if (fsSync.existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      } catch (err) {
        console.error(`Error deleting file ${filePath}:`, err);
      }
    }

    console.error('Processing error:', error);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
  
  // const UpdateInventoryListById = async (req, res) => {
  //   const uploadedFiles = [];
  
  //   try {
  //     // Use any() to handle dynamic number of files
  //     await new Promise((resolve, reject) => {
  //       upload.any()(req, res, (err) => {
  //         if (err) {
  //           console.error('Upload error:', err);
  //           reject(err);
  //         } else {
  //           resolve();
  //         }
  //       });
  //     });
  
  //     const brandId = req.params.id;
  //     const { brandName } = req.body;
  
  //     // Handle employees array properly
  //     let employees = req.body.employees;
  //     if (!Array.isArray(employees)) {
  //       employees = [employees].filter(Boolean);
  //     }
  
  //     // Get the existing brand
  //     const existingBrand = await Brand.findById(brandId);
  //     if (!existingBrand) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'Brand not found'
  //       });
  //     }
  
  //     // Validate required fields
  //     if (!brandName) {
  //       throw new Error('Brand name is required');
  //     }
  
  //     // Validate employees array
  //     if (!employees || employees.length === 0) {
  //       throw new Error('At least one employee is required');
  //     }
  
  //     // Enhanced helper function to clean image URL
  //     const cleanImageUrl = (url) => {
  //       if (!url) return null;
        
  //       // Remove domain part if it exists (including http://localhost:5000)
  //       const urlWithoutDomain = url.replace(/^https?:\/\/[^\/]+/, '');
        
  //       // Extract the /uploads/products/filename part
  //       const match = urlWithoutDomain.match(/\/uploads\/products\/[^?#]+/);
        
  //       // If we found a match, return it, otherwise return the cleaned url
  //       return match ? match[0] : urlWithoutDomain;
  //     };
  
  //     // Parse products data
  //     let productsData;
  //     try {
  //       productsData = typeof req.body.products === 'string' 
  //         ? JSON.parse(req.body.products) 
  //         : req.body.products;
  //     } catch (e) {
  //       console.error('Error parsing products:', e);
  //       throw new Error('Invalid products data format');
  //     }
  
  //     // Ensure productsData is an array
  //     productsData = Array.isArray(productsData) ? productsData : [productsData];
  
  //     // Process each product
  //     const products = await Promise.all(productsData.map(async (product, index) => {
  //       if (!product.name) {
  //         throw new Error(`Product ${index + 1} name is required`);
  //       }
  
  //               // Added validation for unit field
  //               if (!product.unit) {
  //                 throw new Error(`Product ${index + 1} unit is required`);
  //               }
  //       let imageUrl = cleanImageUrl(product.imageUrl);
  
  //       const productImage = req.files.find(file => 
  //         file.fieldname === `products[${index}][image]`
  //       );
  
  //       if (productImage) {
  //         uploadedFiles.push(productImage.path);
  
  //         if (existingBrand.products[index]?.image) {
  //           const oldImagePath = path.join(
  //             __dirname, 
  //             '..', 
  //             cleanImageUrl(existingBrand.products[index].image)
  //           );
            
  //           try {
  //             if (fsSync.existsSync(oldImagePath)) {
  //               await fs.unlink(oldImagePath);
  //             }
  //           } catch (err) {
  //             console.error(`Error deleting old image ${oldImagePath}:`, err);
  //           }
  //         }
  
  //         imageUrl = `/uploads/products/${productImage.filename}`;
  //       } else if (!imageUrl && existingBrand.products[index]?.image) {
  //         imageUrl = cleanImageUrl(existingBrand.products[index].image);
  //       }
  
  //       let expiry_date = null;
  //       if (product.expiry_date && !product.noExpiry) {
  //         expiry_date = new Date(product.expiry_date);
  //       }
  
  //       const productId = existingBrand.products[index]?.productId || new mongoose.Types.ObjectId();
  
  //       return {
  //         productId,
  //         name: product.name,
  //         unit: product.unit, 
  //         image: imageUrl,
  //         noExpiry: product.noExpiry === true || product.noExpiry === 'true',
  //         expiry_date: product.noExpiry ? null : expiry_date
  //       };
  //     }));
  
  //     if (products.length === 0) {
  //       throw new Error('At least one product is required');
  //     }
  
  //     const vendors = await User.find({
  //       _id: { $in: employees },
  //       role: 'Employee'
  //     });
  
  //     if (vendors.length !== employees.length) {
  //       throw new Error('One or more selected vendors are invalid');
  //     }
  
  //     const updatedBrand = await Brand.findByIdAndUpdate(
  //       brandId,
  //       {
  //         brandName,
  //         employees,
  //         products
  //       },
  //       { new: true, runValidators: true }
  //     ).populate('employees', 'name email');
  
  //     res.json({
  //       success: true,
  //       message: 'Brand updated successfully',
  //       data: updatedBrand
  //     });
  
  //   } catch (error) {
  //     // Clean up any uploaded files if there's an error
  //     for (const filePath of uploadedFiles) {
  //       try {
  //         if (fsSync.existsSync(filePath)) {
  //           await fs.unlink(filePath);
  //         }
  //       } catch (err) {
  //         console.error(`Error deleting file ${filePath}:`, err);
  //       }
  //     }
  
  //     console.error('Processing error:', error);
  //     return res.status(400).json({
  //       success: false,
  //       message: error.message
  //     });
  //   }
  // };



  const deleteBrandById = async (req, res) => {
    try {
      const brandId = req.params.id;
  
      // Find the brand first to get product images
      const brand = await Brand.findById(brandId);
      
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }
  
      // Delete all product images first
      for (const product of brand.products) {
        if (product.image) {
          try {
            // Get the image filename from the path
            const imagePath = path.join(__dirname, '..', product.image);
            
            // Check if file exists before attempting to delete
            await fs.access(imagePath);
            await fs.unlink(imagePath);
            console.log(`Successfully deleted image: ${imagePath}`);
          } catch (error) {
            // Log error but continue with deletion if image doesn't exist
            console.error(`Error deleting image for product ${product.name}:`, error);
          }
        }
      }
  
      // Delete the brand document
      const deletedBrand = await Brand.findByIdAndDelete(brandId);
  
      if (!deletedBrand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }
  
      res.status(200).json({
        success: true,
        message: 'Brand and associated data deleted successfully'
      });
  
    } catch (error) {
      console.error('Error in deleteBrandById:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting brand',
        error: error.message
      });
    }
  };

  const StockOrdered = async (req, res) => {
  try {
    // Log incoming data for debugging
    console.log('Received order data:', req.body);
    if (req.file) {
      console.log('Received screenshot:', {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } else {
      console.log('No screenshot received');
    }

    // Input validation
    if (!req.body.brandId || !req.body.products || !req.body.employeeId || !req.body.paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: brandId, products, employeeId, or paymentMethod',
      });
    }

    // Parse products if it comes as string
    let products = req.body.products;
    if (typeof products === 'string') {
      try {
        products = JSON.parse(products);
      } catch (err) {
        console.error('Error parsing products:', err);
        return res.status(400).json({
          success: false,
          message: 'Invalid products format',
        });
      }
    }

    // Validate products array
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products must be a non-empty array',
      });
    }

    // Check if orderId already exists
    const existingOrder = await ProductOrder.findOne({ orderId: req.body.orderId });
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: 'Order ID already exists. Please use a unique Order ID.',
      });
    }

    // Dynamically construct base URL from request
    const baseUrl = `${req.protocol}://${req.get('host')}`; // E.g., http://localhost:3000 or https://yourdomain.com

    // Validate platformId if provided
    let platformId = null;
    if (req.body.platformName) {
      // Check if it's a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(req.body.platformName)) {
        platformId = new mongoose.Types.ObjectId(req.body.platformName);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid platformName format. Expected a valid ObjectId.',
        });
      }
    }

    // Construct order object
    const orderData = {
      orderId: req.body.orderId,
      brandName: req.body.brandId,
      products: products.map((product) => ({
        productId: product.productId,
        quantity: Math.max(1, parseInt(product.quantity)),
        deliveryStatus: product.deliveryStatus || 'Ordered',
      })),
      paymentMethod: req.body.paymentMethod,
      selectedAccount: req.body.paymentMethod === 'online' ? req.body.selectedAccount : null,
      accountDetails: req.body.paymentMethod === 'online' ? req.body.accountDetails : null,
      accountNo: req.body.accountNo,
      password: req.body.password,
      employeeName: req.body.employeeId,
      orderAmount: parseFloat(req.body.orderAmount),
      discountAmount: parseFloat(req.body.discountAmount || 0),
      finalAmount: parseFloat(req.body.finalAmount),
      fullAddress: req.body.fullAddress?.trim(),
      phoneNo: req.body.phoneNo?.trim(),
      deliveryPhoneNo: req.body.deliveryPhoneNo?.trim(),
      username: req.body.username?.trim(),
      note: req.body.note?.trim(),
      platformName: platformId, // Store as ObjectId instead of trimmed string
      screenshot: req.file ? `${baseUrl}/uploads/products/${req.file.filename}` : null, // Store dynamic full URL
    };

    // Create and save new order
    const newOrder = new ProductOrder(orderData);
    await newOrder.save();

    console.log('Order saved successfully:', {
      orderId: newOrder.orderId,
      id: newOrder._id,
      screenshot: newOrder.screenshot,
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder,
    });
  } catch (error) {
    console.error('Error creating order:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate order ID. Please use a unique Order ID.',
      });
    }

    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// const StockOrdered = async (req, res) => {
//   try {
//     // Log incoming data for debugging
//     console.log('Received order data:', req.body);
//     if (req.file) {
//       console.log('Received screenshot:', {
//         filename: req.file.filename,
//         path: req.file.path,
//         size: req.file.size,
//         mimetype: req.file.mimetype,
//       });
//     } else {
//       console.log('No screenshot received');
//     }

//     // Input validation
//     if (!req.body.brandId || !req.body.products || !req.body.employeeId || !req.body.paymentMethod) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields: brandId, products, employeeId, or paymentMethod',
//       });
//     }

//     // Parse products if it comes as string
//     let products = req.body.products;
//     if (typeof products === 'string') {
//       try {
//         products = JSON.parse(products);
//       } catch (err) {
//         console.error('Error parsing products:', err);
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid products format',
//         });
//       }
//     }

//     // Validate products array
//     if (!Array.isArray(products) || products.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Products must be a non-empty array',
//       });
//     }

//     // Check if orderId already exists
//     const existingOrder = await ProductOrder.findOne({ orderId: req.body.orderId });
//     if (existingOrder) {
//       return res.status(400).json({
//         success: false,
//         message: 'Order ID already exists. Please use a unique Order ID.',
//       });
//     }

//     // Dynamically construct base URL from request
//     const baseUrl = `${req.protocol}://${req.get('host')}`; // E.g., http://localhost:3000 or https://yourdomain.com

//     // Construct order object
//     const orderData = {
//       orderId: req.body.orderId,
//       brandName: req.body.brandId,
//       products: products.map((product) => ({
//         productId: product.productId,
//         quantity: Math.max(1, parseInt(product.quantity)),
//         deliveryStatus: product.deliveryStatus || 'Ordered',
//       })),
//       paymentMethod: req.body.paymentMethod,
//       selectedAccount: req.body.paymentMethod === 'online' ? req.body.selectedAccount : null,
//       accountDetails: req.body.paymentMethod === 'online' ? req.body.accountDetails : null,
//       accountNo: req.body.accountNo,
//       password: req.body.password,
//       employeeName: req.body.employeeId,
//       orderAmount: parseFloat(req.body.orderAmount),
//       discountAmount: parseFloat(req.body.discountAmount || 0),
//       finalAmount: parseFloat(req.body.finalAmount),
//       fullAddress: req.body.fullAddress?.trim(),
//       phoneNo: req.body.phoneNo?.trim(),
//       deliveryPhoneNo: req.body.deliveryPhoneNo?.trim(),
//       username: req.body.username?.trim(),
//       note: req.body.note?.trim(),
//       platformName: req.body.platformName?.trim(),
//       screenshot: req.file ? `${baseUrl}/uploads/products/${req.file.filename}` : null, // Store dynamic full URL
//     };

//     // Create and save new order
//     const newOrder = new ProductOrder(orderData);
//     await newOrder.save();

//     console.log('Order saved successfully:', {
//       orderId: newOrder.orderId,
//       id: newOrder._id,
//       screenshot: newOrder.screenshot,
//     });

//     res.status(201).json({
//       success: true,
//       message: 'Order created successfully',
//       data: newOrder,
//     });
//   } catch (error) {
//     console.error('Error creating order:', error);

//     if (error.name === 'ValidationError') {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation Error',
//         errors: Object.values(error.errors).map((err) => err.message),
//       });
//     }

//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: 'Duplicate order ID. Please use a unique Order ID.',
//       });
//     }

//     if (error.message === 'Only image files are allowed') {
//       return res.status(400).json({
//         success: false,
//         message: error.message,
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message,
//     });
//   }
// };


const FetchAllOrderdProduct = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // or req.params if using route params
    
    // Build the query object
    let query = {};
    
    // If date range is provided, add date filter
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
        // Convert start date to India timezone and set to start of day
        const startDateTime = moment.tz(startDate, 'Asia/Kolkata').startOf('day').utc().toDate();
        query.createdAt.$gte = startDateTime;
      }
      
      if (endDate) {
        // Convert end date to India timezone and set to end of day
        const endDateTime = moment.tz(endDate, 'Asia/Kolkata').endOf('day').utc().toDate();
        query.createdAt.$lte = endDateTime;
      }
    }
    
    const orderData = await ProductOrder.find(query)
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
        platformName: order.platformName,
        // Add formatted date in India timezone for reference
        createdAtIST: moment(order.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
      };
    });

    res.status(200).json({
      success: true,
      message: 'Order data fetched successfully',
      data: orderDataWithProductDetails,
      // Add filter info in response
      filterInfo: {
        startDate: startDate ? moment.tz(startDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
        endDate: endDate ? moment.tz(endDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
        timezone: 'Asia/Kolkata',
        totalRecords: orderDataWithProductDetails.length
      }
    });
  } catch (e) {
    console.error('Error fetching order data:', e);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: e.message
    });
  }
};


const FetchOrdersByEmployeeId = async (req, res) => {
  try {
    const employeeId = req.params.id || req.body.employeeId || req.query.employeeId;
    const { startDate, endDate } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }
    
    // Build the query object
    let query = { employeeName: employeeId };
    
    // If date range is provided, add date filter
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
        // Convert start date to India timezone and set to start of day
        const startDateTime = moment.tz(startDate, 'Asia/Kolkata').startOf('day').utc().toDate();
        query.createdAt.$gte = startDateTime;
      }
      
      if (endDate) {
        // Convert end date to India timezone and set to end of day
        const endDateTime = moment.tz(endDate, 'Asia/Kolkata').endOf('day').utc().toDate();
        query.createdAt.$lte = endDateTime;
      }
    }
    
    const orderData = await ProductOrder.find(query)
      .sort({ createdAt: -1 })
      .populate('brandName', 'brandName products')
      .populate('employeeName', 'fullName email phone address -_id')
      .populate({
        path: 'selectedAccount',
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
      })
      // Add population for screenshot and platformName fields
      .populate('screenshot')
      .populate('platformName');

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
        selectedAccount: order.selectedAccount,
        // Include the screenshot and platformName fields
        screenshot: order.screenshot,
        platformName: order.platformName,
        // Add formatted date in India timezone for reference
        createdAtIST: moment(order.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
      };
    });
    
    res.status(200).json({
      success: true,
      message: 'Employee order data fetched successfully',
      data: orderDataWithProductDetails,
      // Add filter info in response
      filterInfo: {
        employeeId: employeeId,
        startDate: startDate ? moment.tz(startDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
        endDate: endDate ? moment.tz(endDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
        timezone: 'Asia/Kolkata',
        totalRecords: orderDataWithProductDetails.length
      }
    });
  } catch (e) {
    console.error('Error fetching employee order data:', e);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: e.message,
      // Include filter info even in error response for debugging
      filterInfo: {
        employeeId: req.params.id || req.body.employeeId || req.query.employeeId || null,
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
        timezone: 'Asia/Kolkata'
      }
    });
  }
};




const updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId, productId, newStatus } = req.body;

    // Validate the new status
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery status'
      });
    }

    // First, get the current order to access the remaining quantity
    const currentOrder = await ProductOrder.findOne({
      orderId: orderId,
      'products.productId': productId
    });

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order or product not found'
      });
    }

    // Find the current product to get its remaining quantity
    const currentProduct = currentOrder.products.find(
      product => product.productId.toString() === productId
    );

    const remainingQuantityBeforeDelivery = currentProduct.remaining_quantity;

    // Find and update the specific product's delivery status
    const updatedOrder = await ProductOrder.findOneAndUpdate(
      {
        orderId: orderId,
        'products.productId': productId
      },
      {
        $set: {
          'products.$.deliveryStatus': newStatus,
          ...(newStatus === 'Delivered' && { 'products.$.remaining_quantity': 0 })
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).populate('brandName employeeName');

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order or product not found'
      });
    }

    // Find the updated product in the array
    const updatedProduct = updatedOrder.products.find(
      product => product.productId.toString() === productId
    );

    let deliveryRecord = null;

    // If status is changed to Delivered, create delivery record
    if (newStatus === 'Delivered') {
      console.log('Creating delivery record for delivered product');

      // Create new delivery record only for the specific product
      const newDelivery = new ProductDelivery({
        orderId,
        brandId: updatedOrder.brandName._id,
        employeeId: updatedOrder.employeeName._id,
        deliveryDate: new Date(),
        products: [{
          productId: productId,
          quantity: remainingQuantityBeforeDelivery, // Use the saved remaining quantity
          deliveryStatus: 'delivered'
        }]
      });

      console.log('New Delivery Record to be saved:', {
        orderId: newDelivery.orderId,
        brandId: newDelivery.brandId,
        employeeId: newDelivery.employeeId,
        deliveryDate: newDelivery.deliveryDate,
        products: newDelivery.products
      });

      // Save the delivery record
      deliveryRecord = await newDelivery.save();
      console.log('Delivery record saved successfully');

      // Check if all products are delivered
      const allDelivered = updatedOrder.products.every(
        product => product.deliveryStatus === 'Delivered'
      );

      // If all products are delivered, update order status
      if (allDelivered) {
        await ProductOrder.findOneAndUpdate(
          { orderId: orderId },
          { $set: { status: 'Delivered' } }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: newStatus === 'Delivered' ?
        'Delivery status updated and delivery record created' :
        'Delivery status updated',
      data: {
        orderId: updatedOrder.orderId,
        productId: productId,
        newStatus: updatedProduct.deliveryStatus,
        deliveryRecord: deliveryRecord,
        remainingQuantityBeforeDelivery // Include this in the response for verification
      }
    });

  } catch (error) {
    console.error('Error updating delivery status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const FetchOrderProduct = async(req,res)=>{
  try {
    const orderId = req.params.orderId;
    
    const orderDetails = await ProductOrder.aggregate([
        {
            $match: {
                orderId: orderId
            }
        },
        // Lookup brand information
        {
            $lookup: {
                from: 'brands',
                localField: 'brandName',
                foreignField: '_id',
                as: 'brandInfo'
            }
        },
        {
            $unwind: {
                path: '$brandInfo',
                preserveNullAndEmptyArrays: true
            }
        },
        // Lookup user (employee) information
        {
            $lookup: {
                from: 'users',
                localField: 'employeeName',
                foreignField: '_id',
                as: 'employeeInfo'
            }
        },
        {
            $unwind: {
                path: '$employeeInfo',
                preserveNullAndEmptyArrays: true
            }
        },
        // Updated: Lookup platform information using the ObjectId reference
        {
            $lookup: {
                from: 'platforms',
                localField: 'platformName',
                foreignField: '_id',
                as: 'platformInfo'
            }
        },
        {
            $unwind: {
                path: '$platformInfo',
                preserveNullAndEmptyArrays: true
            }
        },
        // Unwind the products array to process each product
        {
            $unwind: {
                path: '$products',
                preserveNullAndEmptyArrays: true
            }
        },
        // Lookup product details from the brand's products array
        {
            $lookup: {
                from: 'brands',
                let: { 
                    brandId: '$brandName',
                    productId: '$products.productId'
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ['$_id', '$$brandId']
                            }
                        }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $match: {
                            $expr: {
                                $eq: ['$products.productId', '$$productId']
                            }
                        }
                    },
                    {
                        $project: {
                            'product': '$products'
                        }
                    }
                ],
                as: 'productDetails'
            }
        },
        {
            $unwind: {
                path: '$productDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        // Reshape the data for the response
        {
            $project: {
                _id: 1,
                orderId: 1,
                orderAmount: 1,
                fullAddress: 1,
                phoneNo: 1,
                deliveryPhoneNo: 1,
                username: 1,
                accountDetails: 1,
                accountNo: 1,
                password: 1, 
                note: 1,
                createdAt: 1,
                updatedAt: 1,
                screenshot: 1,
                // Updated: Include full platform details
                platform: {
                    _id: '$platformInfo._id',
                    name: '$platformInfo.name',
                    reviewEnabled: { $ifNull: ['$platformInfo.reviewEnabled', false] }
                },
                brand: {
                    _id: '$brandInfo._id',
                    name: '$brandInfo.brandName'
                },
                employee: {
                    _id: '$employeeInfo._id',
                    name: '$employeeInfo.fullName'
                },
                product: {
                    productId: '$products.productId',
                    quantity: '$products.quantity',
                    remaining_quantity:'$products.remaining_quantity',
                    deliveryStatus: '$products.deliveryStatus',
                    name: '$productDetails.product.name',
                    image: '$productDetails.product.image',
                    noExpiry: '$productDetails.product.noExpiry',
                    expiry_date: '$productDetails.product.expiry_date'
                }
            }
        },
        // Group back the products
        {
            $group: {
                _id: '$_id',
                orderId: { $first: '$orderId' },
                orderAmount: { $first: '$orderAmount' },
                fullAddress: { $first: '$fullAddress' },
                phoneNo: { $first: '$phoneNo' },
                deliveryPhoneNo: { $first: '$deliveryPhoneNo' },
                username: { $first: '$username' },
                accountDetails: { $first: '$accountDetails' },
                accountNo: { $first: '$accountNo' },
                password: { $first: '$password' },  
                note: { $first: '$note' },
                createdAt: { $first: '$createdAt' },
                updatedAt: { $first: '$updatedAt' },
                brand: { $first: '$brand' },
                employee: { $first: '$employee' },
                screenshot: { $first: '$screenshot' },
                // Updated: Keep the full platform object in grouping
                platform: { $first: '$platform' },
                products: { 
                    $push: {
                        $cond: [
                            { $ne: ['$product.productId', null] },
                            '$product',
                            '$$REMOVE'
                        ]
                    }
                }
            }
        }
    ]);

    if (!orderDetails || orderDetails.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }

    res.status(200).json({
        success: true,
        data: orderDetails[0]
    });

} catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
        success: false,
        message: 'Error fetching order details',
        error: error.message
    });
}
};

// const FetchOrderProduct = async(req,res)=>{
//   try {
//     const orderId = req.params.orderId;
    
//     const orderDetails = await ProductOrder.aggregate([
//         {
//             $match: {
//                 orderId: orderId
//             }
//         },
//         // Lookup brand information
//         {
//             $lookup: {
//                 from: 'brands',
//                 localField: 'brandName',
//                 foreignField: '_id',
//                 as: 'brandInfo'
//             }
//         },
//         {
//             $unwind: {
//                 path: '$brandInfo',
//                 preserveNullAndEmptyArrays: true
//             }
//         },
//         // Lookup user (employee) information
//         {
//             $lookup: {
//                 from: 'users',
//                 localField: 'employeeName',
//                 foreignField: '_id',
//                 as: 'employeeInfo'
//             }
//         },
//         {
//             $unwind: {
//                 path: '$employeeInfo',
//                 preserveNullAndEmptyArrays: true
//             }
//         },
//         // Unwind the products array to process each product
//         {
//             $unwind: {
//                 path: '$products',
//                 preserveNullAndEmptyArrays: true
//             }
//         },
//         // Lookup product details from the brand's products array
//         {
//             $lookup: {
//                 from: 'brands',
//                 let: { 
//                     brandId: '$brandName',
//                     productId: '$products.productId'
//                 },
//                 pipeline: [
//                     {
//                         $match: {
//                             $expr: {
//                                 $eq: ['$_id', '$$brandId']
//                             }
//                         }
//                     },
//                     {
//                         $unwind: '$products'
//                     },
//                     {
//                         $match: {
//                             $expr: {
//                                 $eq: ['$products.productId', '$$productId']
//                             }
//                         }
//                     },
//                     {
//                         $project: {
//                             'product': '$products'
//                         }
//                     }
//                 ],
//                 as: 'productDetails'
//             }
//         },
//         {
//             $unwind: {
//                 path: '$productDetails',
//                 preserveNullAndEmptyArrays: true
//             }
//         },
//         // Reshape the data for the response
//         {
//             $project: {
//                 _id: 1,
//                 orderId: 1,
//                 orderAmount: 1,
//                 fullAddress: 1,
//                 phoneNo: 1,
//                 deliveryPhoneNo: 1,
//                 username: 1,
//                 accountDetails: 1,
//                 note: 1,
//                 createdAt: 1,
//                 updatedAt: 1,
//                 platformName: 1, // Add platformName
//                 screenshot: 1, // Add screenshot
//                 brand: {
//                     _id: '$brandInfo._id',
//                     name: '$brandInfo.brandName'
//                 },
//                 employee: {
//                     _id: '$employeeInfo._id',
//                     name: '$employeeInfo.fullName'
//                 },
//                 product: {
//                     productId: '$products.productId',
//                     quantity: '$products.quantity',
//                     remaining_quantity:'$products.remaining_quantity',
//                     deliveryStatus: '$products.deliveryStatus',
//                     name: '$productDetails.product.name',
//                     image: '$productDetails.product.image',
//                     noExpiry: '$productDetails.product.noExpiry',
//                     expiry_date: '$productDetails.product.expiry_date'
//                 }
//             }
//         },
//         // Group back the products
//         {
//             $group: {
//                 _id: '$_id',
//                 orderId: { $first: '$orderId' },
//                 orderAmount: { $first: '$orderAmount' },
//                 fullAddress: { $first: '$fullAddress' },
//                 phoneNo: { $first: '$phoneNo' },
//                 deliveryPhoneNo: { $first: '$deliveryPhoneNo' },
//                 username: { $first: '$username' },
//                 accountDetails: { $first: '$accountDetails' },
//                 note: { $first: '$note' },
//                 createdAt: { $first: '$createdAt' },
//                 updatedAt: { $first: '$updatedAt' },
//                 brand: { $first: '$brand' },
//                 employee: { $first: '$employee' },
//                 platformName: { $first: '$platformName' },
//                 screenshot: { $first: '$screenshot' },
//                 products: { 
//                     $push: {
//                         $cond: [
//                             { $ne: ['$product.productId', null] },
//                             '$product',
//                             '$$REMOVE'
//                         ]
//                     }
//                 }
//             }
//         }
//     ]);

//     if (!orderDetails || orderDetails.length === 0) {
//         return res.status(404).json({
//             success: false,
//             message: 'Order not found'
//         });
//     }

//     res.status(200).json({
//         success: true,
//         data: orderDetails[0]
//     });

// } catch (error) {
//     console.error('Error fetching order details:', error);
//     res.status(500).json({
//         success: false,
//         message: 'Error fetching order details',
//         error: error.message
//     });
// }
// };



// const ProductDelivered = async (req, res) => {
//   try {
//     // Validate request body
//     console.log('Received request to mark products as delivered:', req.body);
//     const { orderId, brandId, employeeId,platformName, deliveryDate, products } = req.body;

//     // Check if all required fields are present
//     if (!orderId || !brandId || !employeeId || !deliveryDate || !products || !products.length) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields'
//       });
//     }

//     // Validate ObjectIds
//     if (!mongoose.Types.ObjectId.isValid(brandId)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid brandId format'
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(employeeId)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid employeeId format'
//       });
//     }

//     // Validate products array
//     for (const product of products) {
//       if (!mongoose.Types.ObjectId.isValid(product.productId)) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid productId format'
//         });
//       }

//       if (!Number.isInteger(product.quantity) || product.quantity <= 0) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid quantity'
//         });
//       }
//     }

//     try {
//       // Find product order
//       const productOrder = await ProductOrder.findOne({ orderId });

//       if (!productOrder) {
//         return res.status(404).json({
//           success: false,
//           message: 'Product order not found'
//         });
//       }

//       // Validate and update remaining quantities
//       for (const deliveredProduct of products) {
//         const orderProduct = productOrder.products.find(
//           p => p.productId.toString() === deliveredProduct.productId.toString()
//         );

//         if (!orderProduct) {
//           return res.status(400).json({
//             success: false,
//             message: `Product ${deliveredProduct.productId} not found in order`
//           });
//         }

//         // Check if remaining quantity is sufficient
//         if (deliveredProduct.quantity > orderProduct.remaining_quantity) {
//           return res.status(400).json({
//             success: false,
//             message: `Delivery quantity (${deliveredProduct.quantity}) exceeds remaining quantity (${orderProduct.remaining_quantity}) for product ${deliveredProduct.productId}`
//           });
//         }

//         // Update remaining quantity
//         orderProduct.remaining_quantity -= deliveredProduct.quantity;
        
//         // Update delivery status if remaining quantity is 0
//         if (orderProduct.remaining_quantity === 0) {
//           orderProduct.deliveryStatus = 'Delivered';
//         }
//       }

//       // Create new delivery record
//       const newDelivery = new ProductDelivery({
//         orderId,
//         brandId,
//         employeeId,
//          platformName,
//         deliveryDate: new Date(deliveryDate),
//         products: products.map(product => ({
//           productId: product.productId,
//           quantity: product.quantity,
//           deliveryStatus: 'delivered'
//         }))
//       });

//       // Save delivery record
//       await newDelivery.save();

//       // Check if all products are delivered
//       const allDelivered = productOrder.products.every(
//         product => product.remaining_quantity === 0
//       );

//       // Update order status if all products are delivered
//       if (allDelivered) {
//         productOrder.status = 'Delivered';
//       }

//       // Save the updated product order
//       await productOrder.save();

//       // Send success response
//       res.status(201).json({
//         success: true,
//         message: 'Delivery record created and quantities updated successfully',
//         data: {
//           delivery: newDelivery,
//           updatedOrder: productOrder
//         }
//       });

//     } catch (error) {
//       throw error;
//     }

//   } catch (error) {
//     console.error('Error creating delivery record:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };

//============SECOND IS USED FOR PRODUCT DELIVERED=====================

// const ProductDelivered = async (req, res) => {
//   try {
//     // Log incoming request data
//     console.log('==================== PRODUCT DELIVERED - START ====================');
//     console.log('Timestamp:', new Date().toISOString());
//     console.log('Received request to mark products as delivered:', req.body);
//     console.log('File upload data:', req.file || 'No file uploaded');
    
//     const { orderId, brandId, employeeId, platformName, deliveryDate, products, reviewLink } = req.body;
    
//     console.log('Parsed products data:', typeof products === 'string' ? JSON.parse(products) : products);
//     console.log('Review link received:', reviewLink || 'No review link provided');

//     // Check if all required fields are present
//     console.log('Validating required fields...');
//     if (!orderId || !brandId || !employeeId || !deliveryDate || !products || !products.length) {
//       console.error('Missing required fields:', {
//         orderId: !!orderId,
//         brandId: !!brandId,
//         employeeId: !!employeeId,
//         deliveryDate: !!deliveryDate,
//         products: !!products,
//         productsLength: products ? products.length : 0
//       });
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields'
//       });
//     }
//     console.log('Required fields validation passed');

//     // Validate ObjectIds
//     console.log('Validating ObjectIds...');
//     if (!mongoose.Types.ObjectId.isValid(brandId)) {
//       console.error('Invalid brandId format:', brandId);
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid brandId format'
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(employeeId)) {
//       console.error('Invalid employeeId format:', employeeId);
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid employeeId format'
//       });
//     }
//     console.log('ObjectIds validation passed');

//     // Validate products array
//     console.log('Validating products array...');
//     const productsArray = typeof products === 'string' ? JSON.parse(products) : products;
    
//     for (const [index, product] of productsArray.entries()) {
//       console.log(`Validating product at index ${index}:`, product);
      
//       if (!mongoose.Types.ObjectId.isValid(product.productId)) {
//         console.error('Invalid productId format:', product.productId);
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid productId format'
//         });
//       }

//       const quantity = parseInt(product.quantity, 10);
//       if (!Number.isInteger(quantity) || quantity <= 0) {
//         console.error('Invalid quantity:', {
//           original: product.quantity,
//           parsed: quantity,
//           isInteger: Number.isInteger(quantity),
//           isPositive: quantity > 0
//         });
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid quantity'
//         });
//       }
//     }
//     console.log('Products array validation passed');

//     try {
//       // Find product order
//       console.log('Looking up product order with orderId:', orderId);
//       const productOrder = await ProductOrder.findOne({ orderId });

//       if (!productOrder) {
//         console.error('Product order not found for orderId:', orderId);
//         return res.status(404).json({
//           success: false,
//           message: 'Product order not found'
//         });
//       }
//       console.log('Found product order:', {
//         id: productOrder._id,
//         orderId: productOrder.orderId,
//         status: productOrder.status,
//         productsCount: productOrder.products.length
//       });

//       // Validate and update remaining quantities
//       console.log('Validating and updating remaining quantities...');
//       for (const [index, deliveredProduct] of productsArray.entries()) {
//         console.log(`Processing delivery product at index ${index}:`, deliveredProduct);
        
//         const orderProduct = productOrder.products.find(
//           p => p.productId.toString() === deliveredProduct.productId.toString()
//         );

//         if (!orderProduct) {
//           console.error(`Product ${deliveredProduct.productId} not found in order`);
//           return res.status(400).json({
//             success: false,
//             message: `Product ${deliveredProduct.productId} not found in order`
//           });
//         }
        
//         console.log('Found matching product in order:', {
//           productId: orderProduct.productId,
//           remaining_quantity: orderProduct.remaining_quantity,
//           deliveryStatus: orderProduct.deliveryStatus
//         });

//         const deliveryQuantity = parseInt(deliveredProduct.quantity, 10);
        
//         // Check if remaining quantity is sufficient
//         if (deliveryQuantity > orderProduct.remaining_quantity) {
//           console.error('Insufficient remaining quantity:', {
//             productId: deliveredProduct.productId,
//             deliveryQuantity,
//             remainingQuantity: orderProduct.remaining_quantity
//           });
//           return res.status(400).json({
//             success: false,
//             message: `Delivery quantity (${deliveryQuantity}) exceeds remaining quantity (${orderProduct.remaining_quantity}) for product ${deliveredProduct.productId}`
//           });
//         }

//         // Update remaining quantity
//         const originalRemainingQuantity = orderProduct.remaining_quantity;
//         orderProduct.remaining_quantity -= deliveryQuantity;
        
//         console.log('Updated remaining quantity:', {
//           productId: orderProduct.productId,
//           before: originalRemainingQuantity,
//           deliveryQuantity,
//           after: orderProduct.remaining_quantity
//         });
        
//         // Update delivery status if remaining quantity is 0
//         if (orderProduct.remaining_quantity === 0) {
//           console.log(`Product ${orderProduct.productId} fully delivered, updating status to 'Delivered'`);
//           orderProduct.deliveryStatus = 'Delivered';
//         }
//       }
      
//       // Dynamically construct base URL from request
//       const baseUrl = `${req.protocol}://${req.get('host')}`;
//       console.log('Constructed base URL:', baseUrl);

//       // Create new delivery record
//       console.log('Creating new delivery record...');
//       const deliveryData = {
//         orderId,
//         brandId,
//         employeeId,
//         platformName,
//         deliveryDate: new Date(deliveryDate),
//         reviewLink, // Add reviewLink to the delivery data
//         products: productsArray.map(product => ({
//           productId: product.productId,
//           quantity: parseInt(product.quantity, 10),
//           deliveryStatus: 'delivered'
//         }))
//       };

//       // Add screenshot if available
//       if (req.file) {
//         deliveryData.reviewScreenshot = `${baseUrl}/uploads/products/${req.file.filename}`;
//         console.log('Screenshot attached to delivery record:', {
//           filename: req.file.filename,
//           path: req.file.path,
//           size: req.file.size,
//           mimetype: req.file.mimetype,
//           fullUrl: deliveryData.reviewScreenshot
//         });
//       } else {
//         console.log('No screenshot file provided');
//       }

//       console.log('Final delivery data:', deliveryData);
//       const newDelivery = new ProductDelivery(deliveryData);

//       // Save delivery record
//       console.log('Saving new delivery record...');
//       const savedDelivery = await newDelivery.save();
//       console.log('Delivery record saved successfully:', {
//         id: savedDelivery._id,
//         orderId: savedDelivery.orderId,
//         brandId: savedDelivery.brandId,
//         employeeId: savedDelivery.employeeId,
//         productsCount: savedDelivery.products.length,
//         hasScreenshot: !!savedDelivery.reviewScreenshot,
//         reviewLink: savedDelivery.reviewLink // Log the saved reviewLink
//       });

//       // Check if all products are delivered
//       const allDelivered = productOrder.products.every(
//         product => product.remaining_quantity === 0
//       );

//       console.log('Checking if all products are delivered:', {
//         allDelivered,
//         productStatuses: productOrder.products.map(p => ({
//           productId: p.productId,
//           remaining: p.remaining_quantity,
//           status: p.deliveryStatus
//         }))
//       });

//       // Update order status if all products are delivered
//       if (allDelivered) {
//         console.log(`All products in order ${orderId} are fully delivered, updating order status to 'Delivered'`);
//         productOrder.status = 'Delivered';
//       }

//       // Save the updated product order
//       console.log('Saving updated product order...');
//       await productOrder.save();
//       console.log('Product order updated successfully:', {
//         id: productOrder._id,
//         orderId: productOrder.orderId,
//         status: productOrder.status
//       });

//       // Send success response
//       console.log('Sending success response to client');
//       res.status(201).json({
//         success: true,
//         message: 'Delivery record created and quantities updated successfully',
//         data: {
//           delivery: newDelivery,
//           updatedOrder: productOrder
//         }
//       });
//       console.log('==================== PRODUCT DELIVERED - END ====================');

//     } catch (error) {
//       console.error('Error in inner try block:', error);
//       throw error;
//     }

//   } catch (error) {
//     console.error('==================== PRODUCT DELIVERED - ERROR ====================');
//     console.error('Error creating delivery record:', error);
//     console.error('Error stack:', error.stack);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//     console.error('==================== PRODUCT DELIVERED - ERROR END ====================');
//   }
// };


const ProductDelivered = async (req, res) => {
  try {
    // Log incoming request data
    console.log('==================== PRODUCT DELIVERED - START ====================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Received request to mark products as delivered:', req.body);
    console.log('File upload data:', req.file || 'No file uploaded');
    
    const { 
      orderId, 
      brandId, 
      employeeId, 
      platformName, 
      deliveryDate, 
      products, 
      reviewLink,
      accountNo,       // New optional field
      password,        // New optional field 
      reviewDate       // New optional field
    } = req.body;
    
    console.log('Parsed products data:', typeof products === 'string' ? JSON.parse(products) : products);
    console.log('Review link received:', reviewLink || 'No review link provided');
    console.log('Account number received:', accountNo || 'No account number provided');
    console.log('Password received:', password ? '********' : 'No password provided');
    console.log('Review date received:', reviewDate || 'No review date provided');

    // Check if all required fields are present
    console.log('Validating required fields...');
    if (!orderId || !brandId || !employeeId || !deliveryDate || !products || !products.length) {
      console.error('Missing required fields:', {
        orderId: !!orderId,
        brandId: !!brandId,
        employeeId: !!employeeId,
        deliveryDate: !!deliveryDate,
        products: !!products,
        productsLength: products ? products.length : 0
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    console.log('Required fields validation passed');

    // Validate ObjectIds
    console.log('Validating ObjectIds...');
    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      console.error('Invalid brandId format:', brandId);
      return res.status(400).json({
        success: false,
        message: 'Invalid brandId format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      console.error('Invalid employeeId format:', employeeId);
      return res.status(400).json({
        success: false,
        message: 'Invalid employeeId format'
      });
    }
    
    // Validate platformName as ObjectId only if provided and not empty
    let validPlatformName = null;
    if (platformName && platformName.trim() !== '') {
      if (!mongoose.Types.ObjectId.isValid(platformName)) {
        console.error('Invalid platformName format:', platformName);
        return res.status(400).json({
          success: false,
          message: 'Invalid platformName format'
        });
      }
      validPlatformName = platformName;
      console.log('Valid platformName found:', validPlatformName);
    } else {
      console.log('No platformName provided or empty string, setting to null');
    }
    console.log('ObjectIds validation passed');

    // Validate products array
    console.log('Validating products array...');
    const productsArray = typeof products === 'string' ? JSON.parse(products) : products;
    
    for (const [index, product] of productsArray.entries()) {
      console.log(`Validating product at index ${index}:`, product);
      
      if (!mongoose.Types.ObjectId.isValid(product.productId)) {
        console.error('Invalid productId format:', product.productId);
        return res.status(400).json({
          success: false,
          message: 'Invalid productId format'
        });
      }

      const quantity = parseInt(product.quantity, 10);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        console.error('Invalid quantity:', {
          original: product.quantity,
          parsed: quantity,
          isInteger: Number.isInteger(quantity),
          isPositive: quantity > 0
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid quantity'
        });
      }
    }
    console.log('Products array validation passed');

    try {
      // Find product order
      console.log('Looking up product order with orderId:', orderId);
      const productOrder = await ProductOrder.findOne({ orderId });

      if (!productOrder) {
        console.error('Product order not found for orderId:', orderId);
        return res.status(404).json({
          success: false,
          message: 'Product order not found'
        });
      }
      console.log('Found product order:', {
        id: productOrder._id,
        orderId: productOrder.orderId,
        status: productOrder.status,
        productsCount: productOrder.products.length
      });

      // Validate and update remaining quantities
      console.log('Validating and updating remaining quantities...');
      for (const [index, deliveredProduct] of productsArray.entries()) {
        console.log(`Processing delivery product at index ${index}:`, deliveredProduct);
        
        const orderProduct = productOrder.products.find(
          p => p.productId.toString() === deliveredProduct.productId.toString()
        );

        if (!orderProduct) {
          console.error(`Product ${deliveredProduct.productId} not found in order`);
          return res.status(400).json({
            success: false,
            message: `Product ${deliveredProduct.productId} not found in order`
          });
        }
        
        console.log('Found matching product in order:', {
          productId: orderProduct.productId,
          remaining_quantity: orderProduct.remaining_quantity,
          deliveryStatus: orderProduct.deliveryStatus
        });

        const deliveryQuantity = parseInt(deliveredProduct.quantity, 10);
        
        // Check if remaining quantity is sufficient
        if (deliveryQuantity > orderProduct.remaining_quantity) {
          console.error('Insufficient remaining quantity:', {
            productId: deliveredProduct.productId,
            deliveryQuantity,
            remainingQuantity: orderProduct.remaining_quantity
          });
          return res.status(400).json({
            success: false,
            message: `Delivery quantity (${deliveryQuantity}) exceeds remaining quantity (${orderProduct.remaining_quantity}) for product ${deliveredProduct.productId}`
          });
        }

        // Update remaining quantity
        const originalRemainingQuantity = orderProduct.remaining_quantity;
        orderProduct.remaining_quantity -= deliveryQuantity;
        
        console.log('Updated remaining quantity:', {
          productId: orderProduct.productId,
          before: originalRemainingQuantity,
          deliveryQuantity,
          after: orderProduct.remaining_quantity
        });
        
        // Update delivery status if remaining quantity is 0
        if (orderProduct.remaining_quantity === 0) {
          console.log(`Product ${orderProduct.productId} fully delivered, updating status to 'Delivered'`);
          orderProduct.deliveryStatus = 'Delivered';
        }
      }
      
      // Dynamically construct base URL from request
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      console.log('Constructed base URL:', baseUrl);

      // Create new delivery record
      console.log('Creating new delivery record...');
      const deliveryData = {
        orderId,
        brandId,
        employeeId,
        deliveryDate: new Date(deliveryDate),
        reviewLink,
        products: productsArray.map(product => ({
          productId: product.productId,
          quantity: parseInt(product.quantity, 10),
          deliveryStatus: 'delivered'
        }))
      };

      // Only add platformName if it's a valid ObjectId
      if (validPlatformName) {
        deliveryData.platformName = validPlatformName;
        console.log('Platform name added to delivery record:', validPlatformName);
      }

      // Add optional fields if they exist
      if (accountNo) {
        deliveryData.accountNo = accountNo;
        console.log('Account number added to delivery record');
      }
      
      if (password) {
        deliveryData.password = password;
        console.log('Password added to delivery record');
      }
      
      if (reviewDate) {
        deliveryData.reviewDate = new Date(reviewDate);
        console.log('Review date added to delivery record:', new Date(reviewDate));
      }

      // Add screenshot if available
      if (req.file) {
        deliveryData.reviewScreenshot = `${baseUrl}/uploads/products/${req.file.filename}`;
        console.log('Screenshot attached to delivery record:', {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
          fullUrl: deliveryData.reviewScreenshot
        });
      } else {
        console.log('No screenshot file provided');
      }

      console.log('Final delivery data:', {
        ...deliveryData,
        password: deliveryData.password ? '********' : undefined // Mask password in logs
      });
      const newDelivery = new ProductDelivery(deliveryData);

      // Save delivery record
      console.log('Saving new delivery record...');
      const savedDelivery = await newDelivery.save();
      console.log('Delivery record saved successfully:', {
        id: savedDelivery._id,
        orderId: savedDelivery.orderId,
        brandId: savedDelivery.brandId,
        employeeId: savedDelivery.employeeId,
        platformName: savedDelivery.platformName,
        productsCount: savedDelivery.products.length,
        hasScreenshot: !!savedDelivery.reviewScreenshot,
        reviewLink: savedDelivery.reviewLink,
        hasAccountNo: !!savedDelivery.accountNo,
        hasPassword: !!savedDelivery.password,
        hasReviewDate: !!savedDelivery.reviewDate
      });

      // Check if all products are delivered
      const allDelivered = productOrder.products.every(
        product => product.remaining_quantity === 0
      );

      console.log('Checking if all products are delivered:', {
        allDelivered,
        productStatuses: productOrder.products.map(p => ({
          productId: p.productId,
          remaining: p.remaining_quantity,
          status: p.deliveryStatus
        }))
      });

      // Update order status if all products are delivered
      if (allDelivered) {
        console.log(`All products in order ${orderId} are fully delivered, updating order status to 'Delivered'`);
        productOrder.status = 'Delivered';
      }

      // Save the updated product order
      console.log('Saving updated product order...');
      await productOrder.save();
      console.log('Product order updated successfully:', {
        id: productOrder._id,
        orderId: productOrder.orderId,
        status: productOrder.status
      });

      // Send success response
      console.log('Sending success response to client');
      res.status(201).json({
        success: true,
        message: 'Delivery record created and quantities updated successfully',
        data: {
          delivery: newDelivery,
          updatedOrder: productOrder
        }
      });
      console.log('==================== PRODUCT DELIVERED - END ====================');

    } catch (error) {
      console.error('Error in inner try block:', error);
      throw error;
    }

  } catch (error) {
    console.error('==================== PRODUCT DELIVERED - ERROR ====================');
    console.error('Error creating delivery record:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
    console.error('==================== PRODUCT DELIVERED - ERROR END ====================');
  }
};


const fetchDeliveredProduct = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // or req.params if using route params
    
    // Build the date filter for aggregation pipeline
    let dateMatchStage = {};
    
    // If date range is provided, add date filter
    if (startDate || endDate) {
      dateMatchStage.deliveryDate = {};
      
      if (startDate) {
        // Convert start date to India timezone and set to start of day
        const startDateTime = moment.tz(startDate, 'Asia/Kolkata').startOf('day').utc().toDate();
        dateMatchStage.deliveryDate.$gte = startDateTime;
      }
      
      if (endDate) {
        // Convert end date to India timezone and set to end of day
        const endDateTime = moment.tz(endDate, 'Asia/Kolkata').endOf('day').utc().toDate();
        dateMatchStage.deliveryDate.$lte = endDateTime;
      }
    }
    
    // Build aggregation pipeline
    const pipeline = [];
    
    // Add date filter as first stage if provided
    if (Object.keys(dateMatchStage).length > 0) {
      pipeline.push({ $match: dateMatchStage });
    }
    
    // Add the rest of the aggregation pipeline
    pipeline.push(
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
          // Add formatted delivery date in India timezone
          deliveryDateIST: {
            $dateToString: {
              format: "%Y-%m-%d %H:%M:%S",
              date: "$deliveryDate",
              timezone: "Asia/Kolkata"
            }
          },
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
    );
    
    // Execute aggregation pipeline
    const productDeliveries = await ProductDelivery.aggregate(pipeline);
    
    // If no deliveries found
    if (productDeliveries.length === 0) {
      return res.status(404).json({ 
        message: 'No product deliveries found',
        filterInfo: {
          startDate: startDate ? moment.tz(startDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
          endDate: endDate ? moment.tz(endDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
          timezone: 'Asia/Kolkata'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product deliveries fetched successfully',
      data: productDeliveries,
      // Add filter info in response
      filterInfo: {
        startDate: startDate ? moment.tz(startDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
        endDate: endDate ? moment.tz(endDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
        timezone: 'Asia/Kolkata',
        totalRecords: productDeliveries.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching detailed product deliveries:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


const CompleteDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('Received orderId:', orderId);
    
    // First fetch the original order
    const originalOrder = await ProductOrder.findOne({ orderId })
      .populate('brandName', '_id')
      .populate('employeeName', '_id');
    
    if (!originalOrder) {
      console.log('No order found with orderId:', orderId);
      return res.status(404).json({
        success: false,
        message: `Order not found with ID: ${orderId}`
      });
    }
    
    // Extract platformId directly from the original order
    // In ProductOrder, platformName is already stored as ObjectId('68283ad790b6a7fe307ac74e')
    const platformId = originalOrder.platformName || null;
    
    console.log('Original Order Details:', {
      orderId: originalOrder.orderId,
      brandName: originalOrder.brandName,
      employeeName: originalOrder.employeeName,
      platformName: originalOrder.platformName, // This should show the ObjectId
      accountNo: originalOrder.accountNo || null,
      password: originalOrder.password || null,
      products: originalOrder.products
    });
    
    // Filter out products that are already delivered with 0 remaining quantity
    const productsToDeliver = originalOrder.products.filter(product => 
      !(product.deliveryStatus === 'Delivered' && product.remaining_quantity === 0)
    );
    
    if (productsToDeliver.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All products in this order are already delivered'
      });
    }
    
    // Create delivery products array with current remaining quantities
    const deliveryProducts = productsToDeliver.map(product => ({
      productId: product.productId,
      quantity: product.remaining_quantity,
      remaining_quantity: 0,
      deliveryStatus: 'delivered'
    }));
    
    console.log('Delivery Products to be created:', deliveryProducts);
    
    // Create new delivery record with proper fields
    const deliveryData = {
      orderId,
      brandId: originalOrder.brandName._id,
      employeeId: originalOrder.employeeName._id,
      platformName: platformId, // Directly use the ObjectId from the original order
      deliveryDate: new Date(),
      // Add account number and password from the original order
      accountNo: originalOrder.accountNo || null,
      password: originalOrder.password || null,
      products: deliveryProducts
    };
    
    // Log the deliveryData object before creating newDelivery to verify
    console.log('Delivery data prepared:', deliveryData);
    
    const newDelivery = new ProductDelivery(deliveryData);
    
    console.log('New Delivery Record to be saved:', {
      orderId: newDelivery.orderId,
      brandId: newDelivery.brandId,
      employeeId: newDelivery.employeeId,
      platformName: newDelivery.platformName, // This should now match the original platformName ObjectId
      accountNo: newDelivery.accountNo,
      password: newDelivery.password,
      deliveryDate: newDelivery.deliveryDate,
      products: newDelivery.products
    });
    
    // Save the delivery record first
    await newDelivery.save();
    console.log('Delivery record saved successfully');
    
    // Then update the order status and quantities
    const updatedOrder = await ProductOrder.findOneAndUpdate(
      { orderId: orderId },
      {
        $set: {
          'products.$[].deliveryStatus': 'Delivered',
          'products.$[].remaining_quantity': 0,
          'status': 'Delivered'
        }
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    console.log('Updated Order Details:', {
      orderId: updatedOrder.orderId,
      brandName: updatedOrder.brandName,
      employeeName: updatedOrder.employeeName,
      platformName: updatedOrder.platformName,
      products: updatedOrder.products.map(p => ({
        productId: p.productId,
        quantity: p.quantity,
        deliveryStatus: p.deliveryStatus,
        remaining_quantity: p.remaining_quantity
      }))
    });
    
    return res.status(200).json({
      success: true,
      message: 'Order delivery completed and delivery record created successfully',
      data: {
        delivery: newDelivery,
        updatedOrder: updatedOrder
      }
    });
  } catch (error) {
    console.error('Error completing order delivery:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating order delivery status',
      error: error.message
    });
  }
};

// const CompleteDelivery = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     console.log('Received orderId:', orderId);

//     // First fetch the original order
//     const originalOrder = await ProductOrder.findOne({ orderId })
//       .populate('brandName', '_id')
//       .populate('employeeName', '_id');

//     if (!originalOrder) {
//       console.log('No order found with orderId:', orderId);
//       return res.status(404).json({
//         success: false,
//         message: `Order not found with ID: ${orderId}`
//       });
//     }

//     console.log('Original Order Details:', {
//       orderId: originalOrder.orderId,
//       brandName: originalOrder.brandName,
//       employeeName: originalOrder.employeeName,
//       products: originalOrder.products
//     });

//     // Filter out products that are already delivered with 0 remaining quantity
//     const productsToDeliver = originalOrder.products.filter(product => 
//       !(product.deliveryStatus === 'Delivered' && product.remaining_quantity === 0)
//     );

//     if (productsToDeliver.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'All products in this order are already delivered'
//       });
//     }

//     // Create delivery products array with current remaining quantities
//     const deliveryProducts = productsToDeliver.map(product => ({
//       productId: product.productId,
//       quantity: product.remaining_quantity,
//       remaining_quantity: 0, // Save current remaining quantity
//       deliveryStatus: 'delivered'
//     }));

//     console.log('Delivery Products to be created:', deliveryProducts);

//     // Create new delivery record using details from original order
//     const newDelivery = new ProductDelivery({
//       orderId,
//       brandId: originalOrder.brandName._id,
//       employeeId: originalOrder.employeeName._id,
//       deliveryDate: new Date(),
//       products: deliveryProducts
//     });

//     console.log('New Delivery Record to be saved:', {
//       orderId: newDelivery.orderId,
//       brandId: newDelivery.brandId,
//       employeeId: newDelivery.employeeId,
//       deliveryDate: newDelivery.deliveryDate,
//       products: newDelivery.products
//     });

//     // Save the delivery record first
//     await newDelivery.save();
//     console.log('Delivery record saved successfully');

//     // Then update the order status and quantities
//     const updatedOrder = await ProductOrder.findOneAndUpdate(
//       { orderId: orderId },
//       {
//         $set: {
//           'products.$[].deliveryStatus': 'Delivered',
//           'products.$[].remaining_quantity': 0,
//           'status': 'Delivered'
//         }
//       },
//       {
//         new: true,
//         runValidators: true
//       }
//     );

//     console.log('Updated Order Details:', {
//       orderId: updatedOrder.orderId,
//       brandName: updatedOrder.brandName,
//       employeeName: updatedOrder.employeeName,
//       products: updatedOrder.products.map(p => ({
//         productId: p.productId,
//         quantity: p.quantity,
//         deliveryStatus: p.deliveryStatus,
//         remaining_quantity: p.remaining_quantity
//       }))
//     });

//     return res.status(200).json({
//       success: true,
//       message: 'Order delivery completed and delivery record created successfully',
//       data: {
//         delivery: newDelivery,
//         updatedOrder: updatedOrder
//       }
//     });

//   } catch (error) {
//     console.error('Error completing order delivery:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error updating order delivery status',
//       error: error.message
//     });
//   }
// };

const deleteProductOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
        code: 'ORDER_ID_MISSING'
      });
    }

    // Check if a product delivery record exists for the given orderId
    const existingDelivery = await ProductDelivery.findOne({ orderId });

    if (existingDelivery) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete order because a product delivery record exists',
        code: 'ORDER_DELIVERY_EXISTS'
      });
    }

    // Find the order
    const deletedOrder = await ProductOrder.findOneAndDelete({ orderId });

    if (!deletedOrder) {
      return res.status(404).json({
        success: false,
        message: `No order found with ID: ${orderId}`,
        code: 'ORDER_NOT_FOUND'
      });
    }

    // Log the deletion
    console.log('Order deleted successfully:', {
      orderId: deletedOrder.orderId,
      brandName: deletedOrder.brandName,
      products: deletedOrder.products.length,
      deletedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      data: {
        orderId: deletedOrder.orderId,
        brandName: deletedOrder.brandName,
        username: deletedOrder.username,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting order',
      code: 'DELETE_ORDER_ERROR',
      error: error.message
    });
  }
};


// const deleteProductOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     if (!orderId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Order ID is required',
//         code: 'ORDER_ID_MISSING'
//       });
//     }

//     // Find and delete the order
//     const deletedOrder = await ProductOrder.findOneAndDelete({ orderId });

//     if (!deletedOrder) {
//       return res.status(404).json({
//         success: false,
//         message: `No order found with ID: ${orderId}`,
//         code: 'ORDER_NOT_FOUND'
//       });
//     }

//     // Log the deletion
//     console.log('Order deleted successfully:', {
//       orderId: deletedOrder.orderId,
//       brandName: deletedOrder.brandName,
//       products: deletedOrder.products.length,
//       deletedAt: new Date()
//     });

//     return res.status(200).json({
//       success: true,
//       message: 'Order deleted successfully',
//       data: {
//         orderId: deletedOrder.orderId,
//         brandName: deletedOrder.brandName,
//         username: deletedOrder.username,
//         deletedAt: new Date()
//       }
//     });

//   } catch (error) {
//     console.error('Error deleting order:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error deleting order',
//       code: 'DELETE_ORDER_ERROR',
//       error: error.message
//     });
//   }
// };




const getOrderDetailsWithDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get the order details
    const order = await ProductOrder.findOne({ orderId })
      .populate('brandName', 'brandName')  // Populate brand details
      .populate('employeeName', 'fullName')    // Populate employee details
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get brand details with products
    const brand = await Brand.findById(order.brandName._id).lean();
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Create a map of product details from brand
    const brandProductsMap = {};
    brand.products.forEach(product => {
      brandProductsMap[product.productId.toString()] = {
        name: product.name,
        image: product.image,
        noExpiry: product.noExpiry,
        expiry_date: product.expiry_date
      };
    });

    // Get all deliveries for this order
    const deliveries = await ProductDelivery.find({ orderId }).lean();

    // Get consumed products for this order
    const consumedProducts = await ConsumedProduct.find({ orderId }).lean();

    // Calculate delivered quantities for each product
    const deliveredQuantities = {};
    deliveries.forEach(delivery => {
      delivery.products.forEach(product => {
        if (product.deliveryStatus === 'delivered') {
          if (!deliveredQuantities[product.productId.toString()]) {
            deliveredQuantities[product.productId.toString()] = 0;
          }
          deliveredQuantities[product.productId.toString()] += product.quantity;
        }
      });
    });

    // Calculate consumed quantities for each product
    const consumedQuantities = {};
    consumedProducts.forEach(consumed => {
      consumed.products.forEach(product => {
        const productId = product.productId.toString();
        if (!consumedQuantities[productId]) {
          consumedQuantities[productId] = 0;
        }
        consumedQuantities[productId] += product.quantity;
      });
    });

    // Combine order, product, delivery, and consumed information
    const enhancedProducts = order.products.map(product => {
      const productId = product.productId.toString();
      const productDetails = brandProductsMap[productId] || {};
      const deliveredQty = deliveredQuantities[productId] || 0;
      const consumedQty = consumedQuantities[productId] || 0;
      
      return {
        productId: product.productId,
        productDetails: {
          name: productDetails.name || 'Product Not Found',
          image: productDetails.image,
          noExpiry: productDetails.noExpiry,
          expiry_date: productDetails.expiry_date
        },
        orderedQuantity: product.quantity,
        remainingQuantity: product.remaining_quantity,
        deliveredQuantity: deliveredQty,
        consumedQuantity: consumedQty,
        // Calculate available quantity (delivered - consumed)
        availableQuantity: deliveredQty - consumedQty,
        deliveryStatus: product.deliveryStatus
      };
    });

    const response = {
      success: true,
      data: {
        orderId: order.orderId,
        brandDetails: {
          brandId: order.brandName._id,
          brandName: order.brandName.brandName
        },
        employeeDetails: {
          employeeId: order.employeeName._id,
          employeeName: order.employeeName.fullName
        },
        orderAmount: order.orderAmount,
        customerDetails: {
          username: order.username,
          fullAddress: order.fullAddress,
          phoneNo: order.phoneNo,
          deliveryPhoneNo: order.deliveryPhoneNo,
          accountDetails: order.accountDetails
        },
        products: enhancedProducts,
        note: order.note,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in getOrderDetailsWithDelivery:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



const CreateConsumedProduct = async (req, res) => {
  try {
      const {
          orderId,
          brandId,
          employeeId,
          deliveryDate,
          products
      } = req.body;

      // Validate required fields
      if (!orderId || !brandId || !employeeId || !products?.length) {
          return res.status(400).json({
              success: false,
              message: 'Missing required fields'
          });
      }

      // Fetch brand and employee details
      const brand = await Brand.findById(brandId);
      const employee = await User.findById(employeeId);

      if (!brand || !employee) {
          return res.status(404).json({
              success: false,
              message: 'Brand or Employee not found'
          });
      }

      // Get all delivery records for this order
      const deliveryRecords = await ProductDelivery.find({ orderId }).sort({ createdAt: 1 });
      
      if (!deliveryRecords.length) {
          return res.status(404).json({
              success: false,
              message: 'No delivery records found for this order'
          });
      }

      // Process each consumed product
      const consumptionDetails = [];
      for (const consumedProduct of products) {
          let remainingQuantityToConsume = consumedProduct.quantity;
          let consumedFromDeliveries = [];
          
          // Update consumption status across delivery records
          for (const deliveryRecord of deliveryRecords) {
              const deliveredProduct = deliveryRecord.products.find(
                  p => p.productId.toString() === consumedProduct.productId.toString()
              );

              if (deliveredProduct && deliveredProduct.deliveryStatus === 'delivered') {
                  // Calculate already consumed quantity
                  let alreadyConsumedQuantity = 0;
                  if (deliveredProduct.consumptionStatus && deliveredProduct.consumptionStatus !== 'not_consumed') {
                      alreadyConsumedQuantity = parseInt(deliveredProduct.consumptionStatus.split('_')[0]);
                  }
                  
                  // Calculate available quantity in this record
                  const availableQuantity = deliveredProduct.quantity - alreadyConsumedQuantity;
                  
                  if (availableQuantity > 0) {
                      // Calculate how much can be consumed from this record
                      const quantityToConsume = Math.min(remainingQuantityToConsume, availableQuantity);
                      
                      if (quantityToConsume > 0) {
                          const newConsumedQuantity = alreadyConsumedQuantity + quantityToConsume;
                          
                          // Update consumption status
                          await ProductDelivery.updateOne(
                              { 
                                  _id: deliveryRecord._id,
                                  'products.productId': consumedProduct.productId 
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

                          if (remainingQuantityToConsume === 0) break;
                      }
                  }
              }
          }

          // Check if we couldn't consume all requested quantity
          if (remainingQuantityToConsume > 0) {
              return res.status(400).json({
                  success: false,
                  message: `Insufficient available quantity for product ${consumedProduct.productId}. Required: ${consumedProduct.quantity}, Available: ${consumedProduct.quantity - remainingQuantityToConsume}`
              });
          }

          consumptionDetails.push({
              productId: consumedProduct.productId,
              totalQuantity: consumedProduct.quantity,
              consumedFrom: consumedFromDeliveries
          });
      }

      // Create new consumed product record
      const consumedProductRecord = new ConsumedProduct({
          orderId,
          brandId,
          brandName: brand.brandName,
          employeeId,
          employeeName: employee.fullName,
          deliveryDate,
          products,
          consumptionDetails,
          status: 'pending'
      });

      await consumedProductRecord.save();

      res.status(201).json({
          success: true,
          message: 'Consumed product created and delivery records updated successfully',
          data: {
              consumedProduct: consumedProductRecord,
              consumptionDetails
          }
      });

  } catch (error) {
      console.error('Error in consumed product update:', error);
      res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: error.message
      });
  }
};

const GetConsumedProductDetails = async(req,res)=>{
  try {
    const { 
      brandId, 
      employeeId, 
      startDate, 
      endDate, 
      status 
    } = req.query;

    const filter = {};
    if (brandId) filter.brandId = brandId;
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    
    if (startDate && endDate) {
      filter.deliveryDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const consumedProducts = await ConsumedProduct.aggregate([
      { $match: filter },

      // Lookup brand details to get brandName
      {
        $lookup: {
          from: 'brands',
          localField: 'brandId',
          foreignField: '_id',
          as: 'brandData'
        }
      },
      { $unwind: '$brandData' },

      // Lookup employee details to get full name
      {
        $lookup: {
          from: 'users', // Assuming your employee model is in the 'users' collection
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      { $unwind: '$employeeData' },

      {
        $addFields: {
          brandName: '$brandData.brandName',
          employeeName: '$employeeData.fullName', // Adjust this based on your user schema
          products: {
            $map: {
              input: '$products',
              as: 'product',
              in: {
                $mergeObjects: [
                  '$$product',
                  {
                    productDetails: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$brandData.products',
                            as: 'brandProduct',
                            cond: { $eq: ['$$brandProduct.productId', '$$product.productId'] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      },

      // Remove temporary lookup fields
      {
        $project: {
          brandData: 0,
          employeeData: 0
        }
      },

      { $sort: { deliveryDate: -1 } }
    ]);

    res.status(200).json({
      success: true,
      count: consumedProducts.length,
      data: consumedProducts
    });
  } catch (error) {
    console.error('Error fetching consumed products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};





const DeleteProductDeliveryRecord = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔹 Received request to delete ProductDelivery with ID: ${id}`);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`❌ Invalid ProductDelivery ID: ${id}`);
      return res.status(400).json({ message: 'Invalid ProductDelivery ID' });
    }

    // Fetch the delivery record to get order and brand details
    const deliveryRecord = await ProductDelivery.findById(id);
    if (!deliveryRecord) {
      console.log(`❌ ProductDelivery not found for ID: ${id}`);
      return res.status(404).json({ message: 'ProductDelivery not found' });
    }
    console.log(`✅ Found ProductDelivery:`, deliveryRecord);

    // Check if the brandId exists in ConsumedProduct schema
    console.log(`🔎 Checking if brandId ${deliveryRecord.brandId} exists in ConsumedProduct...`);
    const existingConsumedProduct = await ConsumedProduct.findOne({
      "productDetails.brandId": deliveryRecord.brandId
    });

    if (existingConsumedProduct) {
      console.log(`❌ Cannot delete ProductDelivery. Brand ID ${deliveryRecord.brandId} exists in ConsumedProduct.`);
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ProductDelivery as associated products have been consumed'
      });
    }
    console.log(`✅ No consumed products found for brandId ${deliveryRecord.brandId}, proceeding with deletion...`);

    // Fetch the associated product order
    console.log(`🔎 Fetching associated ProductOrder for orderId: ${deliveryRecord.orderId}`);
    const productOrder = await ProductOrder.findOne({ orderId: deliveryRecord.orderId });

    if (!productOrder) {
      console.log(`❌ Associated ProductOrder not found for orderId: ${deliveryRecord.orderId}`);
      return res.status(404).json({ message: 'Associated ProductOrder not found' });
    }
    console.log(`✅ Found associated ProductOrder:`, productOrder);

    // Update the remaining quantity in the product order
    console.log(`🔄 Updating remaining quantity for products in ProductOrder...`);
    const updatedProducts = productOrder.products.map(product => {
      const deliveredProduct = deliveryRecord.products.find(
        dp => dp.productId.toString() === product.productId.toString()
      );

      if (deliveredProduct) {
        console.log(`🔄 Updating productId ${product.productId}: Adding back ${deliveredProduct.quantity} to remaining_quantity`);
        return {
          ...product.toObject(),
          remaining_quantity: product.remaining_quantity + deliveredProduct.quantity
        };
      }
      return product;
    });

    // Update the product order with new remaining quantities
    console.log(`✅ Updating ProductOrder with updated product quantities...`);
    await ProductOrder.findByIdAndUpdate(
      productOrder._id,
      { $set: { products: updatedProducts } },
      { new: true }
    );
    console.log(`✅ ProductOrder updated successfully.`);

    // Now delete the delivery record
    console.log(`🗑️ Deleting ProductDelivery record with ID: ${id}`);
    const deletedDelivery = await ProductDelivery.findByIdAndDelete(id);

    console.log(`✅ ProductDelivery deleted successfully.`);
    res.status(200).json({
      success: true,
      message: 'ProductDelivery deleted successfully and ProductOrder updated',
      deletedDelivery,
      updatedProducts
    });

  } catch (error) {
    console.error('❌ Error deleting ProductDelivery:', error);
    res.status(500).json({
      message: 'Server error while deleting ProductDelivery',
      error: error.message
    });
  }
};


// const DeleteProductDeliveryRecord = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Validate ObjectId format
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: 'Invalid ProductDelivery ID' });
//     }

//     // First fetch the delivery record to get order details before deletion
//     const deliveryRecord = await ProductDelivery.findById(id);

//     if (!deliveryRecord) {
//       return res.status(404).json({ message: 'ProductDelivery not found' });
//     }

//     // Fetch the associated product order
//     const productOrder = await ProductOrder.findOne({ 
//       orderId: deliveryRecord.orderId 
//     });

//     if (!productOrder) {
//       return res.status(404).json({ 
//         message: 'Associated ProductOrder not found'
//       });
//     }

//     // Update the remaining quantity in the product order
//     const updatedProducts = productOrder.products.map(product => {
//       // Find matching product in delivery record
//       const deliveredProduct = deliveryRecord.products.find(
//         dp => dp.productId.toString() === product.productId.toString()
//       );

//       if (deliveredProduct) {
//         // Add back the delivered quantity to remaining_quantity
//         return {
//           ...product.toObject(),
//           remaining_quantity: product.remaining_quantity + deliveredProduct.quantity
//         };
//       }
//       return product;
//     });

//     // Update the product order with new remaining quantities
//     await ProductOrder.findByIdAndUpdate(
//       productOrder._id,
//       { 
//         $set: { products: updatedProducts }
//       },
//       { new: true }
//     );

//     // Now delete the delivery record
//     const deletedDelivery = await ProductDelivery.findByIdAndDelete(id);

//     // Send successful response
//     res.status(200).json({
//       message: 'ProductDelivery deleted successfully and ProductOrder updated',
//       deletedDelivery,
//       updatedProducts
//     });

//   } catch (error) {
//     console.error('Error deleting ProductDelivery:', error);
//     res.status(500).json({ 
//       message: 'Server error while deleting ProductDelivery',
//       error: error.message 
//     });
//   }
// };







const GetProductOrderDetailsById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Product Order ID format'
      });
    }

    // Fetch product order with populated references
    const productOrder = await ProductOrder.findById(id)
      .populate({
        path: 'brandName',
        select: 'brandName employees products createdAt',
      })
      .populate({
        path: 'employeeName',
        select: 'fullName email phoneNumber role',
      })
      .populate({
        path: 'products.productId',
        select: 'name description price category images',
      })
      .populate({
        path: 'platformName',
        select: 'name reviewEnabled'
      });

    // Check if order exists
    if (!productOrder) {
      return res.status(404).json({
        success: false,
        message: 'Product Order not found'
      });
    }

    // Match products with brand's product details and combine information
    const enhancedProducts = productOrder.products.map(orderProduct => {
      const brandProduct = productOrder.brandName.products.find(
        bp => bp.productId.toString() === orderProduct.productId._id.toString()
      );

      return {
        product: {
          ...orderProduct.productId._doc,  // Spread existing product details
          brandProductDetails: brandProduct ? {
            productId: brandProduct.productId,
            name: brandProduct.name,
            image: brandProduct.image,
            noExpiry: brandProduct.noExpiry,
            expiry_date: brandProduct.expiry_date
          } : null
        },
        quantity: orderProduct.quantity,
        remaining_quantity: orderProduct.remaining_quantity,
        deliveryStatus: orderProduct.deliveryStatus
      };
    });

    // Format the response
    const formattedResponse = {
      success: true,
      productOrder: {
        _id: productOrder._id,
        orderId: productOrder.orderId,
        brandDetails: {
          _id: productOrder.brandName._id,
          brandName: productOrder.brandName.brandName,
          employees: productOrder.brandName.employees,
          createdAt: productOrder.brandName.createdAt
        },
        employeeDetails: productOrder.employeeName,
        products: enhancedProducts,
        orderAmount: productOrder.orderAmount,
        deliveryDetails: {
          fullAddress: productOrder.fullAddress,
          phoneNo: productOrder.phoneNo,
          deliveryPhoneNo: productOrder.deliveryPhoneNo,
        },
        customerDetails: {
          username: productOrder.username,
          accountDetails: productOrder.accountDetails,
        },
        paymentMethod:productOrder.paymentMethod,
        discountAmount:productOrder.discountAmount,
        finalAmount:productOrder.finalAmount,
        selectedAccount:productOrder.selectedAccount,
        accountNo: productOrder.accountNo,
        password: productOrder.password,
        note: productOrder.note,
        screenshot: productOrder.screenshot,    // Added screenshot field
        platformDetails: productOrder.platformName ? {
          _id: productOrder.platformName._id,
          name: productOrder.platformName.name,
          reviewEnabled: productOrder.platformName.reviewEnabled
        } : null,
        createdAt: productOrder.createdAt,
        updatedAt: productOrder.updatedAt
      }
    };

    res.status(200).json(formattedResponse);

  } catch (error) {
    console.error('Error fetching Product Order:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Product Order details',
      error: error.message
    });
  }
};


const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const UpdateProductOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate order ID format
    if (!validateObjectId(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order ID format'
        });
    }

    // Log incoming data for debugging
    console.log('Received order update data:', req.body);
    if (req.file) {
      console.log('Received screenshot:', {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } else {
      console.log('No new screenshot received');
    }

    // Validate required fields from request body
    const {
        brandName,
        employeeName,
        orderAmount,
        products,
        fullAddress,
        phoneNo,
        deliveryPhoneNo,
        username,
        // Added new fields
        accountNo,
        password,
        discountAmount,
        finalAmount,
        paymentMethod, 
        selectedAccount,
        accountDetails,
        note,
        platformName,
        existingScreenshot, // Handle existing screenshot
    } = req.body;

    // Existing validation checks...
    if (!brandName || !validateObjectId(brandName)) {
        return res.status(400).json({
            success: false,
            message: 'Valid brand ID is required'
        });
    }

    if (!employeeName || !validateObjectId(employeeName)) {
        return res.status(400).json({
            success: false,
            message: 'Valid employee ID is required'
        });
    }

    // Optional: Add validation for selectedAccount if it's provided
    if (selectedAccount && !validateObjectId(selectedAccount)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid selected account ID'
        });
    }

    // Validate discount and final amounts
    if (discountAmount !== undefined && (isNaN(discountAmount) || discountAmount < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid discount amount'
        });
    }

    if (finalAmount !== undefined && (isNaN(finalAmount) || finalAmount < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid final amount'
        });
    }

    // Parse the products JSON string if it's a string
    let parsedProducts = products;
    if (typeof products === 'string') {
        try {
            parsedProducts = JSON.parse(products);
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: 'Invalid products data format'
            });
        }
    }

    // Now validate the parsed products
    if (!parsedProducts || !Array.isArray(parsedProducts) || parsedProducts.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'At least one product is required'
        });
    }

    // Validate each product in the array
    for (const product of parsedProducts) {
        if (!validateObjectId(product.productId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        if (!product.quantity || product.quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Valid quantity is required for each product'
            });
        }

        if (product.deliveryStatus && 
            !['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled','Ordered'].includes(product.deliveryStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid delivery status'
            });
        }
    }

    // Dynamically construct base URL from request
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Create update object with parsed products data
    const updateData = {
        brandName,
        employeeName,
        orderAmount,
        products: parsedProducts.map(product => ({
            productId: product.productId,
            quantity: product.quantity,
            remaining_quantity: product.remaining_quantity,
            deliveryStatus: product.deliveryStatus || 'Pending'
        })),
        fullAddress,
        phoneNo,
        deliveryPhoneNo,
        username,
        // Add new fields to update data
        accountNo,
        password,
        discountAmount,
        finalAmount,
        paymentMethod,
        note,
        platformName,
    };

    // Handle screenshot update
    if (req.file) {
        // A new screenshot was uploaded
        updateData.screenshot = `${baseUrl}/uploads/products/${req.file.filename}`;
        console.log('Updated with new screenshot:', updateData.screenshot);
    } else if (existingScreenshot) {
        // User is keeping the existing screenshot
        console.log('Keeping existing screenshot:', existingScreenshot);
        // Don't update the screenshot field to keep the existing one
    } else {
        // Check if this is an edit and we're requiring screenshots
        const existingOrder = await ProductOrder.findById(id);
        if (!existingOrder || !existingOrder.screenshot) {
            // This is either a new order or one without a screenshot
            return res.status(400).json({
                success: false,
                message: 'Payment screenshot is required'
            });
        }
        // Otherwise, we're keeping the existing screenshot
    }

    // Process accountDetails
    if (accountDetails) {
        // If it's an array, take the first valid value
        if (Array.isArray(accountDetails)) {
            const validDetails = accountDetails.find(detail => 
                detail !== undefined && detail !== 'undefined');
            if (validDetails) {
                updateData.accountDetails = validDetails;
            }
        } else if (typeof accountDetails === 'string' && accountDetails !== 'undefined') {
            updateData.accountDetails = accountDetails;
        }
    }

    // Conditional assignment of account-related fields based on payment method
    if (paymentMethod === 'cod') {
        updateData.selectedAccount = null;
        updateData.accountDetails = null;
    } else {
        // For 'online' or other payment methods that require account selection
        updateData.selectedAccount = selectedAccount;
        // Keep the accountDetails as processed above
    }

    // Update the order
    const updatedOrder = await ProductOrder.findByIdAndUpdate(
        id,
        updateData,
        { 
            new: true,
            runValidators: true // This ensures schema validators run on update
        }
    ).populate([
        {
            path: 'brandName',
            select: 'brandName employees' // Select the fields you want to return
        },
        {
            path: 'employeeName',
            select: 'fullName email role' // Select the fields you want to return
        },
        // Populate selectedAccount if needed
        {
            path: 'selectedAccount',
            select: '_id accountType accountNumber' // Adjust fields as needed
        }
    ]);

    if (!updatedOrder) {
        return res.status(404).json({
            success: false,
            message: 'Product order not found'
        });
    }

    // Format the response - include new fields
    const formattedResponse = {
        success: true,
        productOrder: {
            _id: updatedOrder._id,
            orderId: updatedOrder.orderId,
            brandDetails: {
                _id: updatedOrder.brandName._id,
                brandName: updatedOrder.brandName.brandName,
                employees: updatedOrder.brandName.employees
            },
            employeeDetails: {
                _id: updatedOrder.employeeName._id,
                fullName: updatedOrder.employeeName.fullName,
                email: updatedOrder.employeeName.email,
                role: updatedOrder.employeeName.role
            },
            products: updatedOrder.products,
            orderAmount: updatedOrder.orderAmount,
            fullAddress: updatedOrder.fullAddress,
            phoneNo: updatedOrder.phoneNo,
            deliveryPhoneNo: updatedOrder.deliveryPhoneNo,
            username: updatedOrder.username,
            // Add new fields to response
            accountNo: updatedOrder.accountNo,
            password: updatedOrder.password,
            discountAmount: updatedOrder.discountAmount,
            finalAmount: updatedOrder.finalAmount,
            selectedAccount: updatedOrder.selectedAccount,
            accountDetails: updatedOrder.accountDetails,
            note: updatedOrder.note,
            platformName: updatedOrder.platformName,
            screenshot: updatedOrder.screenshot,
            createdAt: updatedOrder.createdAt,
            updatedAt: updatedOrder.updatedAt
        }
    };

    res.status(200).json(formattedResponse);

} catch (error) {
    console.error('Error updating product order:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
        success: false,
        message: 'Error updating product order',
        error: error.message
    });
}
};

// const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// const UpdateProductOrder = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Validate order ID format
//     if (!validateObjectId(id)) {
//         return res.status(400).json({
//             success: false,
//             message: 'Invalid order ID format'
//         });
//     }

//     // Validate required fields from request body
//     const {
//         brandName,
//         employeeName,
//         orderAmount,
//         products,
//         fullAddress,
//         phoneNo,
//         deliveryPhoneNo,
//         username,
//         // Added new fields
//         accountNo,
//         password,
//         discountAmount,
//         finalAmount,
//         paymentMethod, 
//         selectedAccount,
//         accountDetails,
//         note
//     } = req.body;

//     // Existing validation checks...
//     if (!brandName || !validateObjectId(brandName)) {
//         return res.status(400).json({
//             success: false,
//             message: 'Valid brand ID is required'
//         });
//     }

//     if (!employeeName || !validateObjectId(employeeName)) {
//         return res.status(400).json({
//             success: false,
//             message: 'Valid employee ID is required'
//         });
//     }

//     // Optional: Add validation for selectedAccount if it's provided
//     if (selectedAccount && !validateObjectId(selectedAccount)) {
//         return res.status(400).json({
//             success: false,
//             message: 'Invalid selected account ID'
//         });
//     }

//     // Validate discount and final amounts
//     if (discountAmount !== undefined && (isNaN(discountAmount) || discountAmount < 0)) {
//         return res.status(400).json({
//             success: false,
//             message: 'Invalid discount amount'
//         });
//     }

//     if (finalAmount !== undefined && (isNaN(finalAmount) || finalAmount < 0)) {
//         return res.status(400).json({
//             success: false,
//             message: 'Invalid final amount'
//         });
//     }

//     if (!products || !Array.isArray(products) || products.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: 'At least one product is required'
//         });
//     }

//     // Validate each product in the array
//     for (const product of products) {
//         if (!validateObjectId(product.productId)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Invalid product ID format'
//             });
//         }

//         if (!product.quantity || product.quantity < 1) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Valid quantity is required for each product'
//             });
//         }

//         if (product.deliveryStatus && 
//             !['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled','Ordered'].includes(product.deliveryStatus)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Invalid delivery status'
//             });
//         }
//     }

//     // Create update object - include new fields
//     const updateData = {
//         brandName,
//         employeeName,
//         orderAmount,
//         products: products.map(product => ({
//             productId: product.productId,
//             quantity: product.quantity,
//             remaining_quantity: product.remaining_quantity,
//             deliveryStatus: product.deliveryStatus || 'Pending'
//         })),
//         fullAddress,
//         phoneNo,
//         deliveryPhoneNo,
//         username,
//         // Add new fields to update data
//         accountNo,
//         password,
//         discountAmount,
//         finalAmount,
//         paymentMethod,
//         note
//     };

//     // Conditional assignment of account-related fields based on payment method
//     if (paymentMethod === 'cod') {
//       updateData.selectedAccount = null;
//       updateData.accountDetails = null;
//   } else {
//       // For 'online' or other payment methods
//       updateData.selectedAccount = selectedAccount;
//       updateData.accountDetails = accountDetails;
//   }

//     // Update the order
//     const updatedOrder = await ProductOrder.findByIdAndUpdate(
//         id,
//         updateData,
//         { 
//             new: true,
//             runValidators: true // This ensures schema validators run on update
//         }
//     ).populate([
//         {
//             path: 'brandName',
//             select: 'brandName employees' // Select the fields you want to return
//         },
//         {
//             path: 'employeeName',
//             select: 'fullName email role' // Select the fields you want to return
//         },
//         // Populate selectedAccount if needed
//         {
//             path: 'selectedAccount',
//             select: '_id accountType accountNumber' // Adjust fields as needed
//         }
//     ]);

//     if (!updatedOrder) {
//         return res.status(404).json({
//             success: false,
//             message: 'Product order not found'
//         });
//     }

//     // Format the response - include new fields
//     const formattedResponse = {
//         success: true,
//         productOrder: {
//             _id: updatedOrder._id,
//             orderId: updatedOrder.orderId,
//             brandDetails: {
//                 _id: updatedOrder.brandName._id,
//                 brandName: updatedOrder.brandName.brandName,
//                 employees: updatedOrder.brandName.employees
//             },
//             employeeDetails: {
//                 _id: updatedOrder.employeeName._id,
//                 fullName: updatedOrder.employeeName.fullName,
//                 email: updatedOrder.employeeName.email,
//                 role: updatedOrder.employeeName.role
//             },
//             products: updatedOrder.products,
//             orderAmount: updatedOrder.orderAmount,
//             fullAddress: updatedOrder.fullAddress,
//             phoneNo: updatedOrder.phoneNo,
//             deliveryPhoneNo: updatedOrder.deliveryPhoneNo,
//             username: updatedOrder.username,
//             // Add new fields to response
//             accountNo: updatedOrder.accountNo,
//             password: updatedOrder.password,
//             discountAmount: updatedOrder.discountAmount,
//             finalAmount: updatedOrder.finalAmount,
//             selectedAccount: updatedOrder.selectedAccount,
//             accountDetails: updatedOrder.accountDetails,
//             note: updatedOrder.note,
//             createdAt: updatedOrder.createdAt,
//             updatedAt: updatedOrder.updatedAt
//         }
//     };

//     res.status(200).json(formattedResponse);

// } catch (error) {
//     console.error('Error updating product order:', error);
//     res.status(500).json({
//         success: false,
//         message: 'Error updating product order',
//         error: error.message
//     });
// }
// };



const GetBrandsAndProduct = async (req, res) => {
  try {
    // Use populate to get employee details
    const brands = await Brand.find()
      .select('_id brandName products employees')
      .populate({
        path: 'employees',
        model: 'User',
        select: '_id fullName email phone' // Select only needed fields from User
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error('Error in GetBrandsAndProduct:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};


const GetDeliveredProductById = async (req, res) => {
  try {
    // Validate if the ID is a valid MongoDB ObjectId
    const deliveryId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Delivery ID'
      });
    }

    // Find the specific product delivery entry with populated data including platform
    const deliveryEntry = await ProductDelivery.findById(deliveryId)
      .populate({
        path: 'brandId',
        select: 'brandName products employees',
        populate: {
          path: 'employees',
          select: 'fullName email'
        }
      })
      .populate({
        path: 'employeeId',
        select: 'fullName email'
      })
      .populate({
        path: 'platformName', // Now directly populate platformName as it's an ObjectId reference
        select: 'name reviewEnabled'
      });

    // If no delivery entry found
    if (!deliveryEntry) {
      return res.status(404).json({
        success: false,
        message: 'Delivery record not found'
      });
    }

    // Get the brand ID from the delivery entry
    const orderId = deliveryEntry.orderId;

    // Fetch Product Orders for the same order
    const productOrders = await ProductOrder.find({ orderId: orderId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'brandName',
        select: 'brandName'
      })
      .populate({
        path: 'employeeName',
        select: 'fullName email'
      })
      .populate({
        path: 'products.productId',
        select: 'name image noExpiry expiry_date'
      });

    // Prepare delivery details response
    const productsWithOrderDetails = deliveryEntry.products.map(deliveryProduct => {
      // Find matching product in brand's embedded products
      const brandProduct = deliveryEntry.brandId.products.find(
        brandProd => brandProd.productId.toString() === deliveryProduct.productId.toString()
      );
      
      // Find all orders for this specific product
      const relatedOrders = productOrders.flatMap(order => 
        order.products
          .filter(orderProduct => 
            orderProduct.productId._id.toString() === deliveryProduct.productId.toString()
          )
          .map(orderProduct => ({
            orderId: order.orderId,
            orderAmount: order.orderAmount,
            createdAt: order.createdAt,
            orderDetails: {
              quantity: orderProduct.quantity,
              remaining_quantity: orderProduct.remaining_quantity,
              deliveryStatus: orderProduct.deliveryStatus
            }
          }))
      );
      
      // Calculate available quantity (delivery quantity + remaining order quantity)
      const availableQuantity = deliveryProduct.quantity + 
        (relatedOrders[0]?.orderDetails?.remaining_quantity || 0);
      
      // Combine delivery and brand product information
      return {
        // Delivery Product Details
        deliveryDetails: {
          quantity: deliveryProduct.quantity,
          deliveryStatus: deliveryProduct.deliveryStatus,
          consumptionStatus: deliveryProduct.consumptionStatus,
          availableQuantity: availableQuantity // New field added
        },
        
        // Brand Product Details
        productInfo: brandProduct ? {
          productId: brandProduct.productId,
          name: brandProduct.name,
          image: brandProduct.image,
          noExpiry: brandProduct.noExpiry,
          expiry_date: brandProduct.expiry_date
        } : null,
        
        // Combined Order Details for this specific product
        orderDetails: relatedOrders
      };
    });

    // Prepare the final response with platform details
    const responseData = {
      deliveryDetails: {
        _id: deliveryEntry._id,
        orderId: deliveryEntry.orderId,
        deliveryDate: deliveryEntry.deliveryDate,
        
        // Updated platform details handling using populated platformName
        platform: deliveryEntry.platformName ? {
          _id: deliveryEntry.platformName._id,
          name: deliveryEntry.platformName.name,
          reviewEnabled: deliveryEntry.platformName.reviewEnabled
        } : null,
        
        // Added review screenshot field
        reviewScreenshot: deliveryEntry.reviewScreenshot || null,
        reviewLink: deliveryEntry.reviewLink || null,
        
        // Added the three new fields
        reviewDate: deliveryEntry.reviewDate || null,
        accountNo: deliveryEntry.accountNo || null,
        password: deliveryEntry.password || null,
        
        // Brand Details
        brand: {
          _id: deliveryEntry.brandId._id,
          brandName: deliveryEntry.brandId.brandName,
          employees: deliveryEntry.brandId.employees
        },
        
        // Delivery Employee Details
        employee: {
          _id: deliveryEntry.employeeId._id,
          name: deliveryEntry.employeeId.fullName,
          email: deliveryEntry.employeeId.email
        },
        
        // Products with combined details
        products: productsWithOrderDetails
      }
    };

    // Return comprehensive response
    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching delivery details and product orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching details',
      error: error.message
    });
  }
};

const getAllBrandsWithDetails = async (req, res) => {
  try {
    // Get brand ID and date range from query parameters
    const { brandId, startDate, endDate } = req.query;

    // Validate required parameters
    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both start date and end date are required'
      });
    }

    // Validate date format and create date objects using moment with Asia/Delhi timezone
    const start = moment.tz(startDate, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day');
    const end = moment.tz(endDate, 'YYYY-MM-DD', 'Asia/Kolkata').endOf('day');
    
    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format'
      });
    }

    if (start.isAfter(end)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    // Convert to JavaScript Date objects for MongoDB queries
    const startDate_JS = start.toDate();
    const endDate_JS = end.toDate();

    // Find the specific brand
    const brand = await Brand.findById(brandId).lean();
    
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Step 1: Find product orders within date range for this brand
    let productOrders = [];
    let hasOrderData = false;
    
    try {
      productOrders = await ProductOrder.find({
        brandName: brandId,
        createdAt: {
          $gte: startDate_JS,
          $lte: endDate_JS
        }
      }).populate('employeeName', 'fullName email').lean();
      
      hasOrderData = productOrders && productOrders.length > 0;
    } catch (error) {
      console.error(`Error fetching product orders for brand ${brandId}:`, error);
    }

    // Step 2: Find product deliveries within date range (only if orders exist)
    let productDeliveries = [];
    let hasDeliveryData = false;
    
    if (hasOrderData) {
      try {
        productDeliveries = await ProductDelivery.find({
          brandId: brandId,
          deliveryDate: {
            $gte: startDate_JS,
            $lte: endDate_JS
          }
        }).populate('employeeId', 'fullName email').lean();
        
        hasDeliveryData = productDeliveries && productDeliveries.length > 0;
      } catch (error) {
        console.error(`Error fetching product deliveries for brand ${brandId}:`, error);
      }
    }

    // Step 3: Find consumption records within date range (only if deliveries exist)
    let consumptionRecords = [];
    let hasConsumptionData = false;
    
    if (hasDeliveryData) {
      try {
        consumptionRecords = await ConsumedProduct.find({
          'productDetails.brandId': brandId,
          date: {
            $gte: startDate_JS,
            $lte: endDate_JS
          }
        }).populate('employeeId', 'fullName email').lean();
        
        hasConsumptionData = consumptionRecords && consumptionRecords.length > 0;
      } catch (error) {
        console.error(`Error fetching consumption records for brand ${brandId}:`, error);
      }
    }

    // Check if any data exists
    if (!hasOrderData) {
      return res.status(404).json({
        success: false,
        message: 'No product orders found for this brand within the specified date range',
        brandInfo: {
          _id: brand._id,
          brandName: brand.brandName
        },
        dateRange: {
          startDate: startDate,
          endDate: endDate
        }
      });
    }

    if (!hasDeliveryData) {
      return res.status(404).json({
        success: false,
        message: 'Product orders found but no deliveries found within the specified date range',
        brandInfo: {
          _id: brand._id,
          brandName: brand.brandName
        },
        dateRange: {
          startDate: startDate,
          endDate: endDate
        },
        ordersCount: productOrders.length
      });
    }

    // Note: We'll continue processing even if consumption data is missing

    // Process the data (similar to original logic but filtered by date range)
    const productSummaries = {};

    // Initialize product summaries with brand products
    if (brand.products && Array.isArray(brand.products)) {
      brand.products.forEach(product => {
        if (product && product.productId) {
          const productId = product.productId.toString();
          productSummaries[productId] = {
            productId: product.productId || null,
            name: product.name || null,
            unit: product.unit || null,
            // Order details
            ordered: 0,
            lastOrderDate: null,
            lastOrderEmployee: null,
            orderStatus: {
              ordered: 0,
              pending: 0,
              processing: 0,
              shipped: 0,
              delivered: 0,
              cancelled: 0
            },
            // Delivery details
            delivered: 0,
            lastDeliveryDate: null,
            lastDeliveryEmployee: null,
            deliveryStatus: {
              delivered: 0,
              pending: 0,
              failed: 0
            },
            // Consumption details
            consumed: 0,
            lastConsumptionDate: null,
            lastConsumptionEmployee: null,
            // Inventory calculation
            remaining: 0,
            // Product details
            image: product.image || null,
            noExpiry: product.noExpiry || false,
            expiry_date: product.expiry_date || null
          };
        }
      });
    }

    // Process filtered orders
    productOrders.forEach(order => {
      if (order && order.products && Array.isArray(order.products)) {
        order.products.forEach(product => {
          if (product && product.productId) {
            const productId = product.productId.toString();
            if (productSummaries[productId]) {
              productSummaries[productId].ordered += product.quantity || 0;
              
              // Update order status counts
              const status = (product.deliveryStatus || 'ordered').toLowerCase();
              if (productSummaries[productId].orderStatus[status] !== undefined) {
                productSummaries[productId].orderStatus[status]++;
              }
              
              // Update last order date (convert to Asia/Delhi timezone for display)
              if (!productSummaries[productId].lastOrderDate || 
                  (order.createdAt && new Date(order.createdAt) > new Date(productSummaries[productId].lastOrderDate))) {
                productSummaries[productId].lastOrderDate = moment(order.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
                productSummaries[productId].lastOrderEmployee = order.employeeName || null;
              }
            }
          }
        });
      }
    });

    // Process filtered deliveries
    productDeliveries.forEach(delivery => {
      if (delivery && delivery.products && Array.isArray(delivery.products)) {
        delivery.products.forEach(product => {
          if (product && product.productId) {
            const productId = product.productId.toString();
            if (productSummaries[productId]) {
              // Update delivery status counts
              const status = (product.deliveryStatus || 'pending').toLowerCase();
              if (productSummaries[productId].deliveryStatus[status] !== undefined) {
                productSummaries[productId].deliveryStatus[status]++;
              }
              
              if (status === 'delivered') {
                productSummaries[productId].delivered += product.quantity || 0;
              }
              
              // Update last delivery date (convert to Asia/Delhi timezone for display)
              if (!productSummaries[productId].lastDeliveryDate || 
                  (delivery.deliveryDate && new Date(delivery.deliveryDate) > new Date(productSummaries[productId].lastDeliveryDate))) {
                productSummaries[productId].lastDeliveryDate = moment(delivery.deliveryDate).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
                productSummaries[productId].lastDeliveryEmployee = delivery.employeeId || null;
              }
            }
          }
        });
      }
    });

    // Process filtered consumption records (if available)
    if (hasConsumptionData) {
      consumptionRecords.forEach(record => {
        if (record && record.productDetails && Array.isArray(record.productDetails)) {
          record.productDetails.forEach(detail => {
            if (detail && detail.brandId && detail.brandId.toString() === brandId && 
                detail.products && Array.isArray(detail.products)) {
              detail.products.forEach(product => {
                if (product && product.productId) {
                  const productId = product.productId.toString();
                  if (productSummaries[productId]) {
                    productSummaries[productId].consumed += product.consumedQuantity || 0;
                    
                    // Update last consumption date (convert to Asia/Delhi timezone for display)
                    if (!productSummaries[productId].lastConsumptionDate || 
                        (record.date && new Date(record.date) > new Date(productSummaries[productId].lastConsumptionDate))) {
                      productSummaries[productId].lastConsumptionDate = moment(record.date).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
                      productSummaries[productId].lastConsumptionEmployee = record.employeeId || null;
                    }
                  }
                }
              });
            }
          });
        }
      });
    }

    // Calculate remaining inventory for each product
    Object.values(productSummaries).forEach(product => {
      product.remaining = product.delivered - product.consumed;
    });

    // Calculate brand-level statistics
    const brandStats = {
      totalProducts: Object.keys(productSummaries).length || 0,
      totalOrdered: 0,
      totalDelivered: 0,
      totalConsumed: 0,
      totalRemaining: 0,
      oldestOrder: null,
      newestOrder: null,
      oldestDelivery: null,
      newestDelivery: null
    };

    Object.values(productSummaries).forEach(product => {
      brandStats.totalOrdered += product.ordered || 0;
      brandStats.totalDelivered += product.delivered || 0;
      brandStats.totalConsumed += product.consumed || 0;
      brandStats.totalRemaining += product.remaining || 0;
      
      // Update oldest/newest order dates (convert to Asia/Delhi timezone)
      if (product.lastOrderDate) {
        const orderDate = moment(product.lastOrderDate, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Kolkata');
        if (!brandStats.oldestOrder || orderDate.isBefore(moment(brandStats.oldestOrder, 'YYYY-MM-DD HH:mm:ss'))) {
          brandStats.oldestOrder = product.lastOrderDate;
        }
        if (!brandStats.newestOrder || orderDate.isAfter(moment(brandStats.newestOrder, 'YYYY-MM-DD HH:mm:ss'))) {
          brandStats.newestOrder = product.lastOrderDate;
        }
      }
      
      // Update oldest/newest delivery dates (convert to Asia/Delhi timezone)
      if (product.lastDeliveryDate) {
        const deliveryDate = moment(product.lastDeliveryDate, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Kolkata');
        if (!brandStats.oldestDelivery || deliveryDate.isBefore(moment(brandStats.oldestDelivery, 'YYYY-MM-DD HH:mm:ss'))) {
          brandStats.oldestDelivery = product.lastDeliveryDate;
        }
        if (!brandStats.newestDelivery || deliveryDate.isAfter(moment(brandStats.newestDelivery, 'YYYY-MM-DD HH:mm:ss'))) {
          brandStats.newestDelivery = product.lastDeliveryDate;
        }
      }
    });

    // Filter out products with no activity in the date range
    const activeProducts = Object.values(productSummaries).filter(product => 
      product.ordered > 0 || product.delivered > 0 || product.consumed > 0
    );

    return res.status(200).json({
      success: true,
      brandInfo: {
        _id: brand._id,
        brandName: brand.brandName
      },
      dateRange: {
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
        timezone: 'Asia/Kolkata (Delhi)',
        queryRange: {
          from: start.format('YYYY-MM-DD HH:mm:ss'),
          to: end.format('YYYY-MM-DD HH:mm:ss')
        }
      },
      dataAvailability: {
        hasOrderData,
        hasDeliveryData,
        hasConsumptionData
      },
      stats: brandStats,
      productsCount: activeProducts.length,
      recordCounts: {
        orders: productOrders.length,
        deliveries: productDeliveries.length,
        consumptions: consumptionRecords.length
      },
      message: !hasConsumptionData ? 'Orders and deliveries found but no consumption data found within the specified date range' : 'Complete data found',
      products: activeProducts
    });

  } catch (error) {
    console.error('Error fetching brand details by date range:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// const getAllBrandsWithDetails = async (req, res) => {
//   try {
    
//     // Get pagination parameters from query
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     // Sort brands by createdAt in descending order (newest first)
//     const brandsQuery = Brand.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
//     const totalBrandsQuery = Brand.countDocuments();

//     // Run queries in parallel
//     const [brands, totalBrands] = await Promise.all([brandsQuery, totalBrandsQuery]);

//     if (!brands || brands.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No brands found'
//       });
//     }

//     // Process each brand
//     const brandSummaries = await Promise.all(brands.map(async (brand) => {
//       // Safely get all product orders for this brand
//       let productOrders = [];
//       try {
//         productOrders = await ProductOrder.find({
//           brandName: brand._id
//         }).populate('employeeName', 'fullName email').lean() || [];
//       } catch (error) {
//         console.error(`Error fetching product orders for brand ${brand._id}:`, error);
//       }

//       // Safely get all product deliveries for this brand
//       let productDeliveries = [];
//       try {
//         productDeliveries = await ProductDelivery.find({
//           brandId: brand._id
//         }).populate('employeeId', 'fullName email').lean() || [];
//       } catch (error) {
//         console.error(`Error fetching product deliveries for brand ${brand._id}:`, error);
//       }

//       // Safely get consumption records for this brand
//       let consumptionRecords = [];
//       try {
//         consumptionRecords = await ConsumedProduct.find({
//           'productDetails.brandId': brand._id
//         }).populate('employeeId', 'fullName email').lean() || [];
//       } catch (error) {
//         console.error(`Error fetching consumption records for brand ${brand._id}:`, error);
//       }

//       // Prepare product summaries object
//       const productSummaries = {};

//       // Initialize product summaries with brand products
//       if (brand.products && Array.isArray(brand.products)) {
//         brand.products.forEach(product => {
//           if (product && product.productId) {
//             const productId = product.productId.toString();
//             productSummaries[productId] = {
//               productId: product.productId || null,
//               name: product.name || null,
//               unit: product.unit || null,
//               // Order details
//               ordered: 0,
//               lastOrderDate: null,
//               lastOrderEmployee: null,
//               orderStatus: {
//                 ordered: 0,
//                 pending: 0,
//                 processing: 0,
//                 shipped: 0,
//                 delivered: 0,
//                 cancelled: 0
//               },
//               // Delivery details
//               delivered: 0,
//               lastDeliveryDate: null,
//               lastDeliveryEmployee: null,
//               deliveryStatus: {
//                 delivered: 0,
//                 pending: 0,
//                 failed: 0
//               },
//               // Consumption details
//               consumed: 0,
//               lastConsumptionDate: null,
//               lastConsumptionEmployee: null,
//               // Inventory calculation
//               remaining: 0,
//               // Product details
//               image: product.image || null,
//               noExpiry: product.noExpiry || false,
//               expiry_date: product.expiry_date || null
//             };
//           }
//         });
//       }

//       // Process orders to get ordered quantities and status
//       if (productOrders && productOrders.length > 0) {
//         productOrders.forEach(order => {
//           if (order && order.products && Array.isArray(order.products)) {
//             order.products.forEach(product => {
//               if (product && product.productId) {
//                 const productId = product.productId.toString();
//                 if (productSummaries[productId]) {
//                   productSummaries[productId].ordered += product.quantity || 0;
                  
//                   // Update order status counts
//                   const status = (product.deliveryStatus || 'ordered').toLowerCase();
//                   if (productSummaries[productId].orderStatus[status] !== undefined) {
//                     productSummaries[productId].orderStatus[status]++;
//                   }
                  
//                   // Update last order date
//                   if (!productSummaries[productId].lastOrderDate || 
//                       (order.createdAt && new Date(order.createdAt) > new Date(productSummaries[productId].lastOrderDate))) {
//                     productSummaries[productId].lastOrderDate = order.createdAt || null;
//                     productSummaries[productId].lastOrderEmployee = order.employeeName || null;
//                   }
//                 }
//               }
//             });
//           }
//         });
//       }

//       // Process deliveries to get delivered quantities and status
//       if (productDeliveries && productDeliveries.length > 0) {
//         productDeliveries.forEach(delivery => {
//           if (delivery && delivery.products && Array.isArray(delivery.products)) {
//             delivery.products.forEach(product => {
//               if (product && product.productId) {
//                 const productId = product.productId.toString();
//                 if (productSummaries[productId]) {
//                   // Update delivery status counts
//                   const status = (product.deliveryStatus || 'pending').toLowerCase();
//                   if (productSummaries[productId].deliveryStatus[status] !== undefined) {
//                     productSummaries[productId].deliveryStatus[status]++;
//                   }
                  
//                   if (status === 'delivered') {
//                     productSummaries[productId].delivered += product.quantity || 0;
//                   }
                  
//                   // Update last delivery date
//                   if (!productSummaries[productId].lastDeliveryDate || 
//                       (delivery.deliveryDate && new Date(delivery.deliveryDate) > new Date(productSummaries[productId].lastDeliveryDate))) {
//                     productSummaries[productId].lastDeliveryDate = delivery.deliveryDate || null;
//                     productSummaries[productId].lastDeliveryEmployee = delivery.employeeId || null;
//                   }
//                 }
//               }
//             });
//           }
//         });
//       }

//       // Process consumption records to get consumed quantities
//       if (consumptionRecords && consumptionRecords.length > 0) {
//         consumptionRecords.forEach(record => {
//           if (record && record.productDetails && Array.isArray(record.productDetails)) {
//             record.productDetails.forEach(detail => {
//               if (detail && detail.brandId && detail.brandId.toString() === brand._id.toString() && 
//                   detail.products && Array.isArray(detail.products)) {
//                 detail.products.forEach(product => {
//                   if (product && product.productId) {
//                     const productId = product.productId.toString();
//                     if (productSummaries[productId]) {
//                       productSummaries[productId].consumed += product.consumedQuantity || 0;
                      
//                       // Update last consumption date
//                       if (!productSummaries[productId].lastConsumptionDate || 
//                           (record.date && new Date(record.date) > new Date(productSummaries[productId].lastConsumptionDate))) {
//                         productSummaries[productId].lastConsumptionDate = record.date || null;
//                         productSummaries[productId].lastConsumptionEmployee = record.employeeId || null;
//                       }
//                     }
//                   }
//                 });
//               }
//             });
//           }
//         });
//       }

//       // Calculate remaining inventory for each product
//       Object.values(productSummaries).forEach(product => {
//         product.remaining = product.delivered - product.consumed;
//       });

//       // Calculate brand-level statistics
//       const brandStats = {
//         totalProducts: Object.keys(productSummaries).length || 0,
//         totalOrdered: 0,
//         totalDelivered: 0,
//         totalConsumed: 0,
//         totalRemaining: 0,
//         oldestOrder: null,
//         newestOrder: null,
//         oldestDelivery: null,
//         newestDelivery: null
//       };

//       Object.values(productSummaries).forEach(product => {
//         brandStats.totalOrdered += product.ordered || 0;
//         brandStats.totalDelivered += product.delivered || 0;
//         brandStats.totalConsumed += product.consumed || 0;
//         brandStats.totalRemaining += product.remaining || 0;
        
//         // Update oldest/newest order dates
//         if (product.lastOrderDate) {
//           if (!brandStats.oldestOrder || new Date(product.lastOrderDate) < new Date(brandStats.oldestOrder)) {
//             brandStats.oldestOrder = product.lastOrderDate;
//           }
//           if (!brandStats.newestOrder || new Date(product.lastOrderDate) > new Date(brandStats.newestOrder)) {
//             brandStats.newestOrder = product.lastOrderDate;
//           }
//         }
        
//         // Update oldest/newest delivery dates
//         if (product.lastDeliveryDate) {
//           if (!brandStats.oldestDelivery || new Date(product.lastDeliveryDate) < new Date(brandStats.oldestDelivery)) {
//             brandStats.oldestDelivery = product.lastDeliveryDate;
//           }
//           if (!brandStats.newestDelivery || new Date(product.lastDeliveryDate) > new Date(brandStats.newestDelivery)) {
//             brandStats.newestDelivery = product.lastDeliveryDate;
//           }
//         }
//       });

//       // Convert productSummaries object to array
//       const productSummaryArray = Object.values(productSummaries);

//       return {
//         _id: brand._id || null,
//         brandName: brand.brandName || null,
//         stats: brandStats,
//         products: productSummaryArray
//       };
//     }));

//     return res.status(200).json({
//       success: true,
//       count: brandSummaries.length,
//       totalBrands,
//       currentPage: page,
//       totalPages: Math.ceil(totalBrands / limit),
//       hasNextPage: page < Math.ceil(totalBrands / limit),
//       hasPrevPage: page > 1,
//       data: brandSummaries
//     });
//   } catch (error) {
//     console.error('Error fetching brand product summaries:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };


// const getAllBrandsWithDetails = async (req, res) => {
//   try {
    
//     // Get pagination parameters from query
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     // Sort brands by createdAt in descending order (newest first)
//     const brandsQuery = Brand.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
//     const totalBrandsQuery = Brand.countDocuments();

//     // Run queries in parallel
//     const [brands, totalBrands] = await Promise.all([brandsQuery, totalBrandsQuery]);

//     if (!brands || brands.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No brands found'
//       });
//     }

//     // Helper function to format date as YYYY-MM-DD
//     const formatDate = (date) => {
//       if (!date) return null;
//       const d = new Date(date);
//       return d.toISOString().split('T')[0];
//     };

//     // Helper function to initialize date-wise data structure
//     const initializeDateWiseData = () => ({
//       byDate: {}, // { "2024-01-15": { quantity: 10, entries: 2 } }
//       totalQuantity: 0,
//       totalEntries: 0
//     });

//     // Process each brand
//     const brandSummaries = await Promise.all(brands.map(async (brand) => {
//       // Safely get all product orders for this brand
//       let productOrders = [];
//       try {
//         productOrders = await ProductOrder.find({
//           brandName: brand._id
//         }).populate('employeeName', 'fullName email').lean() || [];
//       } catch (error) {
//         console.error(`Error fetching product orders for brand ${brand._id}:`, error);
//       }

//       // Safely get all product deliveries for this brand
//       let productDeliveries = [];
//       try {
//         productDeliveries = await ProductDelivery.find({
//           brandId: brand._id
//         }).populate('employeeId', 'fullName email').lean() || [];
//       } catch (error) {
//         console.error(`Error fetching product deliveries for brand ${brand._id}:`, error);
//       }

//       // Safely get consumption records for this brand
//       let consumptionRecords = [];
//       try {
//         consumptionRecords = await ConsumedProduct.find({
//           'productDetails.brandId': brand._id
//         }).populate('employeeId', 'fullName email').lean() || [];
//       } catch (error) {
//         console.error(`Error fetching consumption records for brand ${brand._id}:`, error);
//       }

//       // Prepare product summaries object
//       const productSummaries = {};

//       // Initialize brand-level date-wise analytics
//       const brandDateWiseAnalytics = {
//         orders: initializeDateWiseData(),
//         deliveries: initializeDateWiseData(),
//         consumption: initializeDateWiseData()
//       };

//       // Initialize product summaries with brand products
//       if (brand.products && Array.isArray(brand.products)) {
//         brand.products.forEach(product => {
//           if (product && product.productId) {
//             const productId = product.productId.toString();
//             productSummaries[productId] = {
//               productId: product.productId || null,
//               name: product.name || null,
//               unit: product.unit || null,
//               // Order details
//               ordered: 0,
//               lastOrderDate: null,
//               lastOrderEmployee: null,
//               orderStatus: {
//                 ordered: 0,
//                 pending: 0,
//                 processing: 0,
//                 shipped: 0,
//                 delivered: 0,
//                 cancelled: 0
//               },
//               // Delivery details
//               delivered: 0,
//               lastDeliveryDate: null,
//               lastDeliveryEmployee: null,
//               deliveryStatus: {
//                 delivered: 0,
//                 pending: 0,
//                 failed: 0
//               },
//               // Consumption details
//               consumed: 0,
//               lastConsumptionDate: null,
//               lastConsumptionEmployee: null,
//               // Inventory calculation
//               remaining: 0,
//               // Product details
//               image: product.image || null,
//               noExpiry: product.noExpiry || false,
//               expiry_date: product.expiry_date || null,
//               // Date-wise analytics for this product
//               dateWiseAnalytics: {
//                 orders: initializeDateWiseData(),
//                 deliveries: initializeDateWiseData(),
//                 consumption: initializeDateWiseData()
//               }
//             };
//           }
//         });
//       }

//       // Process orders to get ordered quantities and status
//       if (productOrders && productOrders.length > 0) {
//         productOrders.forEach(order => {
//           if (order && order.products && Array.isArray(order.products)) {
//             const orderDate = formatDate(order.createdAt);
            
//             order.products.forEach(product => {
//               if (product && product.productId) {
//                 const productId = product.productId.toString();
//                 const quantity = product.quantity || 0;
                
//                 if (productSummaries[productId]) {
//                   productSummaries[productId].ordered += quantity;
                  
//                   // Update order status counts
//                   const status = (product.deliveryStatus || 'ordered').toLowerCase();
//                   if (productSummaries[productId].orderStatus[status] !== undefined) {
//                     productSummaries[productId].orderStatus[status]++;
//                   }
                  
//                   // Update last order date
//                   if (!productSummaries[productId].lastOrderDate || 
//                       (order.createdAt && new Date(order.createdAt) > new Date(productSummaries[productId].lastOrderDate))) {
//                     productSummaries[productId].lastOrderDate = order.createdAt || null;
//                     productSummaries[productId].lastOrderEmployee = order.employeeName || null;
//                   }

//                   // Update product-level date-wise order analytics
//                   if (orderDate) {
//                     if (!productSummaries[productId].dateWiseAnalytics.orders.byDate[orderDate]) {
//                       productSummaries[productId].dateWiseAnalytics.orders.byDate[orderDate] = {
//                         quantity: 0,
//                         entries: 0
//                       };
//                     }
//                     productSummaries[productId].dateWiseAnalytics.orders.byDate[orderDate].quantity += quantity;
//                     productSummaries[productId].dateWiseAnalytics.orders.byDate[orderDate].entries += 1;
//                     productSummaries[productId].dateWiseAnalytics.orders.totalQuantity += quantity;
//                     productSummaries[productId].dateWiseAnalytics.orders.totalEntries += 1;
//                   }
//                 }
//               }
//             });

//             // Update brand-level date-wise order analytics
//             if (orderDate) {
//               if (!brandDateWiseAnalytics.orders.byDate[orderDate]) {
//                 brandDateWiseAnalytics.orders.byDate[orderDate] = {
//                   quantity: 0,
//                   entries: 0
//                 };
//               }
              
//               const orderTotalQuantity = order.products.reduce((sum, p) => sum + (p.quantity || 0), 0);
//               brandDateWiseAnalytics.orders.byDate[orderDate].quantity += orderTotalQuantity;
//               brandDateWiseAnalytics.orders.byDate[orderDate].entries += 1;
//               brandDateWiseAnalytics.orders.totalQuantity += orderTotalQuantity;
//               brandDateWiseAnalytics.orders.totalEntries += 1;
//             }
//           }
//         });
//       }

//       // Process deliveries to get delivered quantities and status
//       if (productDeliveries && productDeliveries.length > 0) {
//         productDeliveries.forEach(delivery => {
//           if (delivery && delivery.products && Array.isArray(delivery.products)) {
//             const deliveryDate = formatDate(delivery.createdAt);
            
//             delivery.products.forEach(product => {
//               if (product && product.productId) {
//                 const productId = product.productId.toString();
//                 const quantity = product.quantity || 0;
                
//                 if (productSummaries[productId]) {
//                   // Update delivery status counts
//                   const status = (product.deliveryStatus || 'pending').toLowerCase();
//                   if (productSummaries[productId].deliveryStatus[status] !== undefined) {
//                     productSummaries[productId].deliveryStatus[status]++;
//                   }
                  
//                   if (status === 'delivered') {
//                     productSummaries[productId].delivered += quantity;
                    
//                     // Update product-level date-wise delivery analytics
//                     if (deliveryDate) {
//                       if (!productSummaries[productId].dateWiseAnalytics.deliveries.byDate[deliveryDate]) {
//                         productSummaries[productId].dateWiseAnalytics.deliveries.byDate[deliveryDate] = {
//                           quantity: 0,
//                           entries: 0
//                         };
//                       }
//                       productSummaries[productId].dateWiseAnalytics.deliveries.byDate[deliveryDate].quantity += quantity;
//                       productSummaries[productId].dateWiseAnalytics.deliveries.byDate[deliveryDate].entries += 1;
//                       productSummaries[productId].dateWiseAnalytics.deliveries.totalQuantity += quantity;
//                       productSummaries[productId].dateWiseAnalytics.deliveries.totalEntries += 1;
//                     }
//                   }
                  
//                   // Update last delivery date
//                   if (!productSummaries[productId].lastDeliveryDate || 
//                       (delivery.deliveryDate && new Date(delivery.deliveryDate) > new Date(productSummaries[productId].lastDeliveryDate))) {
//                     productSummaries[productId].lastDeliveryDate = delivery.deliveryDate || null;
//                     productSummaries[productId].lastDeliveryEmployee = delivery.employeeId || null;
//                   }
//                 }
//               }
//             });

//             // Update brand-level date-wise delivery analytics (only for delivered items)
//             if (deliveryDate) {
//               const deliveredProducts = delivery.products.filter(p => (p.deliveryStatus || 'pending').toLowerCase() === 'delivered');
//               if (deliveredProducts.length > 0) {
//                 if (!brandDateWiseAnalytics.deliveries.byDate[deliveryDate]) {
//                   brandDateWiseAnalytics.deliveries.byDate[deliveryDate] = {
//                     quantity: 0,
//                     entries: 0
//                   };
//                 }
                
//                 const deliveryTotalQuantity = deliveredProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
//                 brandDateWiseAnalytics.deliveries.byDate[deliveryDate].quantity += deliveryTotalQuantity;
//                 brandDateWiseAnalytics.deliveries.byDate[deliveryDate].entries += 1;
//                 brandDateWiseAnalytics.deliveries.totalQuantity += deliveryTotalQuantity;
//                 brandDateWiseAnalytics.deliveries.totalEntries += 1;
//               }
//             }
//           }
//         });
//       }

//       // Process consumption records to get consumed quantities
//       if (consumptionRecords && consumptionRecords.length > 0) {
//         consumptionRecords.forEach(record => {
//           if (record && record.productDetails && Array.isArray(record.productDetails)) {
//             const consumptionDate = formatDate(record.createdAt || record.date);
            
//             record.productDetails.forEach(detail => {
//               if (detail && detail.brandId && detail.brandId.toString() === brand._id.toString() && 
//                   detail.products && Array.isArray(detail.products)) {
//                 detail.products.forEach(product => {
//                   if (product && product.productId) {
//                     const productId = product.productId.toString();
//                     const quantity = product.consumedQuantity || 0;
                    
//                     if (productSummaries[productId]) {
//                       productSummaries[productId].consumed += quantity;
                      
//                       // Update last consumption date
//                       if (!productSummaries[productId].lastConsumptionDate || 
//                           (record.date && new Date(record.date) > new Date(productSummaries[productId].lastConsumptionDate))) {
//                         productSummaries[productId].lastConsumptionDate = record.date || null;
//                         productSummaries[productId].lastConsumptionEmployee = record.employeeId || null;
//                       }

//                       // Update product-level date-wise consumption analytics
//                       if (consumptionDate) {
//                         if (!productSummaries[productId].dateWiseAnalytics.consumption.byDate[consumptionDate]) {
//                           productSummaries[productId].dateWiseAnalytics.consumption.byDate[consumptionDate] = {
//                             quantity: 0,
//                             entries: 0
//                           };
//                         }
//                         productSummaries[productId].dateWiseAnalytics.consumption.byDate[consumptionDate].quantity += quantity;
//                         productSummaries[productId].dateWiseAnalytics.consumption.byDate[consumptionDate].entries += 1;
//                         productSummaries[productId].dateWiseAnalytics.consumption.totalQuantity += quantity;
//                         productSummaries[productId].dateWiseAnalytics.consumption.totalEntries += 1;
//                       }
//                     }
//                   }
//                 });
//               }
//             });

//             // Update brand-level date-wise consumption analytics
//             if (consumptionDate) {
//               if (!brandDateWiseAnalytics.consumption.byDate[consumptionDate]) {
//                 brandDateWiseAnalytics.consumption.byDate[consumptionDate] = {
//                   quantity: 0,
//                   entries: 0
//                 };
//               }
              
//               // Calculate total consumed quantity for this record for this brand
//               let recordTotalQuantity = 0;
//               record.productDetails.forEach(detail => {
//                 if (detail && detail.brandId && detail.brandId.toString() === brand._id.toString() && 
//                     detail.products && Array.isArray(detail.products)) {
//                   recordTotalQuantity += detail.products.reduce((sum, p) => sum + (p.consumedQuantity || 0), 0);
//                 }
//               });
              
//               brandDateWiseAnalytics.consumption.byDate[consumptionDate].quantity += recordTotalQuantity;
//               brandDateWiseAnalytics.consumption.byDate[consumptionDate].entries += 1;
//               brandDateWiseAnalytics.consumption.totalQuantity += recordTotalQuantity;
//               brandDateWiseAnalytics.consumption.totalEntries += 1;
//             }
//           }
//         });
//       }

//       // Calculate remaining inventory for each product
//       Object.values(productSummaries).forEach(product => {
//         product.remaining = product.delivered - product.consumed;
//       });

//       // Calculate brand-level statistics
//       const brandStats = {
//         totalProducts: Object.keys(productSummaries).length || 0,
//         totalOrdered: 0,
//         totalDelivered: 0,
//         totalConsumed: 0,
//         totalRemaining: 0,
//         oldestOrder: null,
//         newestOrder: null,
//         oldestDelivery: null,
//         newestDelivery: null
//       };

//       Object.values(productSummaries).forEach(product => {
//         brandStats.totalOrdered += product.ordered || 0;
//         brandStats.totalDelivered += product.delivered || 0;
//         brandStats.totalConsumed += product.consumed || 0;
//         brandStats.totalRemaining += product.remaining || 0;
        
//         // Update oldest/newest order dates
//         if (product.lastOrderDate) {
//           if (!brandStats.oldestOrder || new Date(product.lastOrderDate) < new Date(brandStats.oldestOrder)) {
//             brandStats.oldestOrder = product.lastOrderDate;
//           }
//           if (!brandStats.newestOrder || new Date(product.lastOrderDate) > new Date(brandStats.newestOrder)) {
//             brandStats.newestOrder = product.lastOrderDate;
//           }
//         }
        
//         // Update oldest/newest delivery dates
//         if (product.lastDeliveryDate) {
//           if (!brandStats.oldestDelivery || new Date(product.lastDeliveryDate) < new Date(brandStats.oldestDelivery)) {
//             brandStats.oldestDelivery = product.lastDeliveryDate;
//           }
//           if (!brandStats.newestDelivery || new Date(product.lastDeliveryDate) > new Date(brandStats.newestDelivery)) {
//             brandStats.newestDelivery = product.lastDeliveryDate;
//           }
//         }
//       });

//       // Convert productSummaries object to array
//       const productSummaryArray = Object.values(productSummaries);

//       return {
//         _id: brand._id || null,
//         brandName: brand.brandName || null,
//         stats: brandStats,
//         dateWiseAnalytics: brandDateWiseAnalytics,
//         products: productSummaryArray
//       };
//     }));

//     return res.status(200).json({
//       success: true,
//       count: brandSummaries.length,
//       totalBrands,
//       currentPage: page,
//       totalPages: Math.ceil(totalBrands / limit),
//       hasNextPage: page < Math.ceil(totalBrands / limit),
//       hasPrevPage: page > 1,
//       data: brandSummaries
//     });
//   } catch (error) {
//     console.error('Error fetching brand product summaries:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };


const fetchDeliveredProductByEmployeeId = async (req, res) => {
  try {
    const employeeId = req.params.id || req.body.employeeId || req.query.employeeId;
    const { startDate, endDate } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    // Convert string ID to ObjectId
    const mongoose = require('mongoose');
    let employeeObjectId;
    
    try {
      employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format'
      });
    }

    // Build the match stage with employee filter
    let matchStage = {
      employeeId: employeeObjectId
    };
    
    // Add date filter if provided
    if (startDate || endDate) {
      matchStage.deliveryDate = {};
      
      if (startDate) {
        // Convert start date to India timezone and set to start of day
        const startDateTime = moment.tz(startDate, 'Asia/Kolkata').startOf('day').utc().toDate();
        matchStage.deliveryDate.$gte = startDateTime;
      }
      
      if (endDate) {
        // Convert end date to India timezone and set to end of day
        const endDateTime = moment.tz(endDate, 'Asia/Kolkata').endOf('day').utc().toDate();
        matchStage.deliveryDate.$lte = endDateTime;
      }
    }

    // Fetch product deliveries with detailed population
    const productDeliveries = await ProductDelivery.aggregate([
      // Match stage to filter by employee ID and date range
      {
        $match: matchStage
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
      
      // Lookup platform details
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
          accountNo: 1,       // Include accountNo field
          password: 1,        // Include password field
          reviewDate: 1,      // Include reviewDate field
          // Add formatted delivery date in India timezone
          deliveryDateIST: {
            $dateToString: {
              format: "%Y-%m-%d %H:%M:%S",
              date: "$deliveryDate",
              timezone: "Asia/Kolkata"
            }
          },
          'platform': {
            '_id': '$platformName',
            'name': { $ifNull: ['$platformDetails.name', 'Unknown Platform'] },
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
      // Sort by deliveryDate in descending order (newest first)
      {
        $sort: { deliveryDate: -1 }
      }
    ]);
    
    // If no deliveries found
    if (productDeliveries.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No product deliveries found for this employee',
        filterInfo: {
          employeeId: employeeId,
          startDate: startDate ? moment.tz(startDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
          endDate: endDate ? moment.tz(endDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
          timezone: 'Asia/Kolkata'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Employee delivery data fetched successfully',
      data: productDeliveries,
      // Add filter info in response
      filterInfo: {
        employeeId: employeeId,
        startDate: startDate ? moment.tz(startDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
        endDate: endDate ? moment.tz(endDate, 'Asia/Kolkata').format('YYYY-MM-DD') : null,
        timezone: 'Asia/Kolkata',
        totalRecords: productDeliveries.length
      }
    });
  } catch (error) {
    console.error('Error fetching detailed product deliveries by employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      // Include filter info even in error response for debugging
      filterInfo: {
        employeeId: req.params.id || req.body.employeeId || req.query.employeeId || null,
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
        timezone: 'Asia/Kolkata'
      }
    });
  }
};

module.exports= {
    createBrand,
    GetAllInventoryList,
    GetInventoryListbyId,
    UpdateInventoryListById,
    deleteBrandById,
    StockOrdered,
    FetchAllOrderdProduct,
    updateDeliveryStatus,
    FetchOrderProduct,
    ProductDelivered,
    fetchDeliveredProduct,
    CompleteDelivery,
    deleteProductOrder,
    getOrderDetailsWithDelivery,
    CreateConsumedProduct,
    GetConsumedProductDetails,
    DeleteProductDeliveryRecord,
    GetProductOrderDetailsById,
    UpdateProductOrder,
    GetBrandsAndProduct,
    GetDeliveredProductById,
    FetchOrdersByEmployeeId,
    getAllBrandsWithDetails,
    fetchDeliveredProductByEmployeeId,
    GetInventoryByEmployeeId
  };