const moment = require('moment-timezone');
const Brand = require('../../models/Brand');
const User = require('../../models/User');
const fs = require('fs').promises;
const mongoose = require('mongoose');

const Offer = require('../../models/Offer');
const DailyAssignWork = require('../../models/dailyAssignWork');
const EmployeeWiseAssignWork = require('../../models/employeeWiseAssignWork');
const EmpEnteredData = require('../../models/EmpEnteredData'); 

const createOffer = async (req, res) => {
  try {
    const { clientId, offerName, previewLink, trackingLinks } = req.body;

    // Basic validation
    if (!clientId || !offerName || !previewLink || !trackingLinks || !trackingLinks.length) {
      return res.status(400).json({ 
        error: 'All fields are required and trackingLinks must not be empty'
      });
    }

    // Check if offer with same name already exists for this client
    const existingOffer = await Offer.findOne({ 
      clientId: clientId, 
      offerName: offerName.trim() // Trim whitespace for comparison
    });

    if (existingOffer) {
      return res.status(409).json({ 
        error: 'Offer name already exists for this client',
        message: `An offer with the name "${offerName}" already exists for this client. Please choose a different name.`
      });
    }

    const offer = new Offer({
      clientId,
      offerName: offerName.trim(), // Trim whitespace before saving
      previewLink,
      trackingLinks
    });

    await offer.save();
    res.status(201).json({ 
      message: 'Offer created successfully', 
      offer 
    });

  } catch (error) {
    // Handle MongoDB duplicate key error (if you have a compound unique index)
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'Duplicate offer name',
        message: 'An offer with this name already exists for this client'
      });
    }

    res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
};


const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate('clientId', 'fullName email phone') // Select specific fields you want
      .exec();
    
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


const getOffersByClientId = async (req, res) => {
  try {
    const { clientId } = req.params; // Get clientId from URL parameters
    
    // Validate if clientId is provided
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }

    // Validate if clientId is a valid MongoDB ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Client ID format'
      });
    }

    // Check if client exists
    const clientExists = await User.findById(clientId).select('_id fullName email');
    if (!clientExists) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Fetch offers for the specific client
    const offers = await Offer.find({ clientId: clientId })
      .populate('clientId', 'fullName email phone address') // Populate client details
      .sort({ createdAt: -1 }) // Sort by newest first
      .exec();

    // Check if offers exist for this client
    if (!offers || offers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No offers found for this client',
        clientInfo: {
          clientId: clientExists._id,
          fullName: clientExists.fullName,
          email: clientExists.email
        },
        data: []
      });
    }

    // Calculate offer statistics
    const offerStats = {
      totalOffers: offers.length,
      activeOffers: offers.filter(offer => offer.isActive === true).length,
      expiredOffers: offers.filter(offer => {
        if (offer.expiryDate) {
          return new Date(offer.expiryDate) < new Date();
        }
        return false;
      }).length
    };

    // Group offers by status if you have status field
    const offersByStatus = offers.reduce((acc, offer) => {
      const status = offer.status || 'active';
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status]++;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: `Offers fetched successfully for client: ${clientExists.fullName}`,
      clientInfo: {
        clientId: clientExists._id,
        fullName: clientExists.fullName,
        email: clientExists.email
      },
      statistics: {
        ...offerStats,
        offersByStatus: offersByStatus
      },
      data: offers
    });

  } catch (error) {
    console.error('Error fetching offers by client ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getOfferById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate if ID is provided
    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: 'Offer ID is required' 
      });
    }
    
    // Validate MongoDB ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid offer ID format' 
      });
    }
    
    const offer = await Offer.findById(id)
      .populate({
        path: 'clientId',
        select: 'fullName email phone',
        options: { strictPopulate: false } // Handle cases where clientId might not exist
      })
      .lean() // Better performance for read-only operations
      .exec();
    
    // Check if offer exists
    if (!offer) {
      return res.status(404).json({ 
        success: false,
        error: 'Offer not found',
        message: `No offer found with ID: ${id}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Offer retrieved successfully',
      data: offer
    });
    
  } catch (error) {
    console.error('Error fetching offer:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid offer ID format',
        details: error.message 
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        error: 'Validation error',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Server error', 
      message: 'Failed to fetch offer',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const updateClientOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validate if ID is provided
    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: 'Offer ID is required' 
      });
    }
    
    // Validate MongoDB ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid offer ID format' 
      });
    }
    
    // Check if update data is provided
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Update data is required'
      });
    }
    
    // Validate clientId if provided
    if (updateData.clientId && !mongoose.Types.ObjectId.isValid(updateData.clientId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid client ID format'
      });
    }
    
    // Validate previewLink format if provided
    if (updateData.previewLink) {
      const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/;
      if (!urlRegex.test(updateData.previewLink)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid preview link format. Must be a valid HTTP/HTTPS URL'
        });
      }
    }
    
    // Validate trackingLinks if provided
    if (updateData.trackingLinks) {
      if (!Array.isArray(updateData.trackingLinks) || updateData.trackingLinks.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'trackingLinks must be a non-empty array'
        });
      }
      
      const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/;
      const marginRegex = /^[0-9]+$/;
      
      for (let i = 0; i < updateData.trackingLinks.length; i++) {
        const trackingLink = updateData.trackingLinks[i];
        
        if (!trackingLink.link || !urlRegex.test(trackingLink.link)) {
          return res.status(400).json({
            success: false,
            error: `Invalid tracking link format at index ${i}. Must be a valid HTTP/HTTPS URL`
          });
        }
        
        if (!trackingLink.margin || !marginRegex.test(trackingLink.margin)) {
          return res.status(400).json({
            success: false,
            error: `Invalid margin format at index ${i}. Must be a string of digits`
          });
        }
      }
    }
    
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    delete updateData.updatedAt; // Let mongoose handle this automatically
    
    // Find and update the offer
    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { 
        new: true, // Return updated document
        runValidators: true, // Run mongoose validators
        context: 'query' // For proper validation context
      }
    )
    .populate('clientId', 'fullName email phone')
    .lean()
    .exec();
    
    // Check if offer exists
    if (!updatedOffer) {
      return res.status(404).json({ 
        success: false,
        error: 'Offer not found',
        message: `No offer found with ID: ${id}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: updatedOffer
    });
    
  } catch (error) {
    console.error('Error updating offer:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({ 
        success: false,
        error: 'Validation error',
        details: validationErrors
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid data format',
        details: error.message 
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry',
        message: 'A record with this data already exists'
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Server error', 
      message: 'Failed to update offer',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid offer ID' });
    }

    const offer = await Offer.findByIdAndDelete(id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    res.status(200).json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};




// const createDailyAndEmpAssignWork = async (req, res) => {
//   try {
//     const { offerEntries, employeeIds } = req.body;

//     // Basic validation
//     if (!offerEntries || !offerEntries.length || !employeeIds || !employeeIds.length) {
//       return res.status(400).json({ error: 'At least one offer entry and one employee ID are required' });
//     }

//     // Validate offer entries
//     for (const entry of offerEntries) {
//       if (!entry.offerId || !entry.entryCount) {
//         return res.status(400).json({ error: 'All offer entries must include offerId and entryCount' });
//       }
//       if (!mongoose.Types.ObjectId.isValid(entry.offerId)) {
//         return res.status(400).json({ error: 'Invalid offerId in offer entries' });
//       }
//       if (isNaN(entry.entryCount) || entry.entryCount <= 0) {
//         return res.status(400).json({ error: 'Entry count must be a positive number' });
//       }
//       // Verify offer exists in Offer collection
//       const offerExists = await Offer.findById(entry.offerId);
//       if (!offerExists) {
//         return res.status(400).json({ error: `Offer with ID ${entry.offerId} does not exist` });
//       }
//     }

//     // Validate employee IDs
//     for (const employeeId of employeeIds) {
//       if (!mongoose.Types.ObjectId.isValid(employeeId)) {
//         return res.status(400).json({ error: 'Invalid employeeId' });
//       }
//     }

//     // Process each offer entry
//     const employeeWiseEntriesCreated = [];
//     for (const entry of offerEntries) {
//       // Verify offer does not already exist in DailyAssignWork
//       const dailyAssignWorkExists = await DailyAssignWork.findOne({ offerId: entry.offerId });
//       if (dailyAssignWorkExists) {
//         return res.status(400).json({ error: `Daily assignment for offer ID ${entry.offerId} already exists` });
//       }

//       // Save the offer with total entry count
//       const newDailyAssignWork = new DailyAssignWork({
//         offerId: entry.offerId,
//         totalEntryCount: entry.entryCount,
//       });
//       await newDailyAssignWork.save();

//       // Calculate distributed entry counts
//       const totalEntryCount = entry.entryCount;
//       const employeeCount = employeeIds.length;
//       const baseEntryCount = Math.floor(totalEntryCount / employeeCount); // Base entries per employee
//       const remainder = totalEntryCount % employeeCount; // Extra entries to distribute

//       if (baseEntryCount === 0) {
//         return res.status(400).json({ error: 'Entry count too low to distribute among employees' });
//       }

//       // Create EmployeeWiseAssignWork documents for each employee
//       const employeeWiseDocs = employeeIds.map((employeeId, index) => {
//         const assignedCount = baseEntryCount + (index < remainder ? 1 : 0); // Distribute remainder
//         return {
//           offerId: entry.offerId,
//           employeeId,
//           entryCount: assignedCount,
//         };
//       });

//       // Save all EmployeeWiseAssignWork documents
//       const savedEntries = await EmployeeWiseAssignWork.insertMany(employeeWiseDocs);
//       employeeWiseEntriesCreated.push(...savedEntries);
//     }

//     res.status(201).json({
//       message: 'Offer entries created successfully',
//       employeeWiseEntries: employeeWiseEntriesCreated,
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Server error', details: error.message });
//   }
// };



const createDailyAndEmpAssignWork = async (req, res) => {
  try {
    const { offerEntries, employeeIds, forceUpdate } = req.body;

    // Basic validation
    if (!offerEntries || !offerEntries.length || !employeeIds || !employeeIds.length) {
      return res.status(400).json({ error: 'At least one offer entry and one employee ID are required' });
    }

    // Get current date in Delhi timezone
    const currentDate = moment.tz('Asia/Kolkata');
    const todayStart = currentDate.clone().startOf('day').toDate();
    const todayEnd = currentDate.clone().endOf('day').toDate();

    // Validate offer entries
    for (const entry of offerEntries) {
      if (!entry.offerId || !entry.entryCount) {
        return res.status(400).json({ error: 'All offer entries must include offerId and entryCount' });
      }
      if (!mongoose.Types.ObjectId.isValid(entry.offerId)) {
        return res.status(400).json({ error: 'Invalid offerId in offer entries' });
      }
      if (isNaN(entry.entryCount) || entry.entryCount <= 0) {
        return res.status(400).json({ error: 'Entry count must be a positive number' });
      }
      // Verify offer exists in Offer collection
      const offerExists = await Offer.findById(entry.offerId);
      if (!offerExists) {
        return res.status(400).json({ error: `Offer with ID ${entry.offerId} does not exist` });
      }
    }

    // Validate employee IDs
    for (const employeeId of employeeIds) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ error: 'Invalid employeeId' });
      }
    }

    // AUTOMATIC DELETION OF PAST ENTRIES - NEW LOGIC
    const offerIdsToCheck = offerEntries.map(entry => entry.offerId);
    
    // Delete ALL previous entries (yesterday and past) for these offers - SILENT DELETION
    const deletedPastEntries = await DailyAssignWork.deleteMany({
      offerId: { $in: offerIdsToCheck },
      createdAt: { $lt: todayStart } // Delete entries before today
    });
    
    // Also delete all related employee assignments for past entries
    const deletedPastEmployeeEntries = await EmployeeWiseAssignWork.deleteMany({
      offerId: { $in: offerIdsToCheck },
      createdAt: { $lt: todayStart } // Delete entries before today
    });
    
    console.log(`Silently deleted ${deletedPastEntries.deletedCount} past daily assignments and ${deletedPastEmployeeEntries.deletedCount} past employee assignments`);

    // Check for existing entries TODAY ONLY - IMPROVED LOGIC
    const existingTodayOffers = [];
    const newOfferEntries = [];
    
    // Create a map of existing entries for better lookup
    const existingEntriesMap = new Map();

    for (const entry of offerEntries) {
      // Check if offer already has daily assignment for TODAY only
      const existingTodayEntry = await DailyAssignWork.findOne({
        offerId: entry.offerId,
        createdAt: {
          $gte: todayStart,
          $lte: todayEnd
        }
      });

      if (existingTodayEntry) {
        existingTodayOffers.push({
          offerId: entry.offerId,
          currentEntryCount: existingTodayEntry.totalEntryCount,
          newEntryCount: entry.entryCount,
          message: `Daily assignment for offer ID ${entry.offerId} already exists for today`
        });
        // Store the existing entry for later use
        existingEntriesMap.set(entry.offerId.toString(), existingTodayEntry);
      } else {
        newOfferEntries.push(entry);
      }
    }

    // If entries exist for today and forceUpdate is not true, ask user for confirmation
    if (existingTodayOffers.length > 0 && !forceUpdate) {
      return res.status(409).json({
        message: 'Entries already exist for today',
        conflictType: 'ENTRIES_EXIST_TODAY',
        existingEntries: existingTodayOffers,
        totalExistingOffers: existingTodayOffers.length,
        totalNewOffers: newOfferEntries.length,
        instruction: 'To update existing entries, send the same request with forceUpdate: true in the request body',
        example: {
          ...req.body,
          forceUpdate: true
        }
      });
    }

    // Determine which offers to process
    const offersToProcess = existingTodayOffers.length > 0 && forceUpdate ? offerEntries : newOfferEntries;

    if (offersToProcess.length === 0) {
      return res.status(400).json({
        message: 'No offers to process',
        details: 'All offers already have assignments for today and forceUpdate was not specified'
      });
    }

    // Get offer IDs to process
    const offerIdsToProcess = offersToProcess.map(entry => entry.offerId);
    
    // Delete TODAY's EmployeeWiseAssignWork entries for these offers (only if updating today's entries)
    let deletedEmployeeCount = { deletedCount: 0 };
    if (forceUpdate && existingTodayOffers.length > 0) {
      deletedEmployeeCount = await EmployeeWiseAssignWork.deleteMany({
        offerId: { $in: offerIdsToProcess },
        createdAt: {
          $gte: todayStart,
          $lte: todayEnd
        }
      });
      console.log(`Deleted ${deletedEmployeeCount.deletedCount} today's employee assignments for update`);
    }

    // Process each offer entry
    const employeeWiseEntriesCreated = [];
    const dailyAssignWorksCreated = [];
    let dailyAssignmentsUpdated = 0;
    let dailyAssignmentsCreated = 0;

    for (const entry of offersToProcess) {
      // FIXED: Use the existing entries map for better logic
      const existingDaily = existingEntriesMap.get(entry.offerId.toString());
      let savedDailyWork;
      
      if (existingDaily && forceUpdate) {
        // Update existing daily assignment
        savedDailyWork = await DailyAssignWork.findOneAndUpdate(
          { _id: existingDaily._id },
          {
            totalEntryCount: entry.entryCount,
            updatedAt: currentDate.toDate()
          },
          { 
            new: true
          }
        );
        dailyAssignmentsUpdated++;
      } else if (!existingDaily) {
        // Create new daily assignment only if no existing entry
        savedDailyWork = await DailyAssignWork.create({
          offerId: entry.offerId,
          totalEntryCount: entry.entryCount,
          createdAt: currentDate.toDate()
        });
        dailyAssignmentsCreated++;
      } else {
        // This should not happen with proper logic, but handle it gracefully
        return res.status(400).json({ 
          error: 'Inconsistent state detected',
          details: `Entry exists for offer ${entry.offerId} but forceUpdate is false or not provided`
        });
      }
      
      dailyAssignWorksCreated.push(savedDailyWork);

      // Calculate distributed entry counts
      const totalEntryCount = entry.entryCount;
      const employeeCount = employeeIds.length;
      const baseEntryCount = Math.floor(totalEntryCount / employeeCount);
      const remainder = totalEntryCount % employeeCount;

      if (baseEntryCount === 0) {
        return res.status(400).json({ error: 'Entry count too low to distribute among employees' });
      }

      // Create EmployeeWiseAssignWork documents for each employee
      const employeeWiseDocs = employeeIds.map((employeeId, index) => {
        const assignedCount = baseEntryCount + (index < remainder ? 1 : 0);
        return {
          offerId: entry.offerId,
          employeeId,
          entryCount: assignedCount,
          createdAt: currentDate.toDate()
        };
      });

      // Save all EmployeeWiseAssignWork documents
      try {
        const savedEntries = await EmployeeWiseAssignWork.insertMany(employeeWiseDocs);
        employeeWiseEntriesCreated.push(...savedEntries);
      } catch (employeeInsertError) {
        console.error('Error inserting employee-wise assignments:', employeeInsertError);
        return res.status(500).json({ 
          error: 'Failed to create employee assignments', 
          details: employeeInsertError.message 
        });
      }
    }

    // Prepare response based on operation type
    let message = '';
    if (forceUpdate && existingTodayOffers.length > 0) {
      message = `Successfully updated ${dailyAssignmentsUpdated} existing entries and created ${dailyAssignmentsCreated} new entries for today`;
    } else {
      message = `Successfully created ${dailyAssignmentsCreated} new entries for today`;
    }

    const response = {
      success: true,
      message: message,
      operationType: forceUpdate && existingTodayOffers.length > 0 ? 'UPDATE' : 'CREATE',
      dailyAssignWorks: dailyAssignWorksCreated,
      employeeWiseEntries: employeeWiseEntriesCreated,
      processedDate: currentDate.format('YYYY-MM-DD HH:mm:ss [IST]'),
      operationSummary: {
        dailyAssignmentsCreated: dailyAssignmentsCreated,
        dailyAssignmentsUpdated: dailyAssignmentsUpdated,
        employeeAssignmentsDeleted: deletedEmployeeCount.deletedCount,
        employeeAssignmentsCreated: employeeWiseEntriesCreated.length,
        totalOffersProcessed: offersToProcess.length,
        pastEntriesCleanedUp: true // Indicates past entries were cleaned up
      }
    };

    // Include update details if it was an update operation
    if (forceUpdate && existingTodayOffers.length > 0) {
      response.updateDetails = {
        updatedOffers: existingTodayOffers,
        message: 'Previous entries were updated with new values'
      };
    }

    res.status(forceUpdate && existingTodayOffers.length > 0 ? 200 : 201).json(response);

  } catch (error) {
    console.error('Error in createDailyAndEmpAssignWork:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'Duplicate entry conflict', 
        details: 'An offer assignment with this ID already exists. Please try again.',
        mongoError: error.message 
      });
    }
    
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};


// Get all daily assign work entries for today only (Delhi timezone)
const getAllDailyAssignWork = async (req, res) => {
  try {
    const moment = require('moment-timezone');
    
    // Get start and end of today in Delhi timezone
    const startOfToday = moment.tz('Asia/Kolkata').startOf('day').toDate();
    const endOfToday = moment.tz('Asia/Kolkata').endOf('day').toDate();
    
    const dailyAssignWork = await DailyAssignWork.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    })
      .populate('offerId', 'offerName description category status') // Populate offer details
      .sort({ createdAt: -1 }); // Sort by newest first
     
    res.status(200).json({
      success: true,
      message: 'Daily assign work retrieved successfully',
      data: dailyAssignWork,
    });
  } catch (error) {
    console.error('Error fetching daily assign work:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily assign work',
      error: error.message,
    });
  }
};


// Get all employee wise assign work entries for today only (Delhi timezone)
const getAllEmployeeWiseAssignWork = async (req, res) => {
  try {
    const moment = require('moment-timezone');
    
    // Get start and end of today in Delhi timezone
    const startOfToday = moment.tz('Asia/Kolkata').startOf('day').toDate();
    const endOfToday = moment.tz('Asia/Kolkata').endOf('day').toDate();
    
    const employeeWiseAssignWork = await EmployeeWiseAssignWork.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    })
      .populate('offerId', 'offerName description category status')
      .populate({
        path: 'employeeId',
        model: 'User',
        select: 'fullName email phone role department'
      })
      .sort({ createdAt: -1 });
     
    res.status(200).json({
      success: true,
      message: 'Employee wise assign work retrieved successfully',
      data: employeeWiseAssignWork,
    });
  } catch (error) {
    console.error('Error fetching employee wise assign work:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee wise assign work',
      error: error.message,
    });
  }
};


const createMultipleEmpEntries = async (req, res) => {
  try {
    const { offers } = req.body;

    // Validation
    if (!offers || !Array.isArray(offers) || offers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'offers array is required and cannot be empty'
      });
    }

    // Validate each offer object
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      
      if (!offer.offerId) {
        return res.status(400).json({
          success: false,
          message: `Offer at index ${i}: offerId is required`
        });
      }

      // Validate offerId format
      if (!mongoose.Types.ObjectId.isValid(offer.offerId)) {
        return res.status(400).json({
          success: false,
          message: `Offer at index ${i}: offerId must be a valid ObjectId`
        });
      }

      if (!offer.employees || !Array.isArray(offer.employees) || offer.employees.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Offer at index ${i}: employees array is required and cannot be empty`
        });
      }

      // Validate each employee within the offer
      for (let j = 0; j < offer.employees.length; j++) {
        const employee = offer.employees[j];
        
        if (!employee.empId || !employee.count) {
          return res.status(400).json({
            success: false,
            message: `Offer at index ${i}, employee at index ${j}: empId and count are required fields`
          });
        }

        // Validate empId format
        if (!mongoose.Types.ObjectId.isValid(employee.empId)) {
          return res.status(400).json({
            success: false,
            message: `Offer at index ${i}, employee at index ${j}: empId must be a valid ObjectId`
          });
        }

        if (!Number.isInteger(employee.count) || employee.count <= 0) {
          return res.status(400).json({
            success: false,
            message: `Offer at index ${i}, employee at index ${j}: count must be a positive integer`
          });
        }

        if (employee.count > 100) {
          return res.status(400).json({
            success: false,
            message: `Offer at index ${i}, employee at index ${j}: count cannot exceed 100 entries per employee`
          });
        }
      }
    }

    // Calculate total entries to be created
    let totalEntries = 0;
    for (const offer of offers) {
      for (const employee of offer.employees) {
        totalEntries += employee.count;
      }
    }
    
    if (totalEntries > 500) {
      return res.status(400).json({
        success: false,
        message: `Total entries (${totalEntries}) cannot exceed 500. Please reduce counts or split into multiple requests.`
      });
    }

    // Function to distribute tracking links based on margins
    const distributeTrackingLinks = (trackingLinks, totalCount) => {
      if (!trackingLinks || trackingLinks.length === 0) {
        return Array(totalCount).fill('');
      }

      // Validate that total margins equal 100%
      const totalMargin = trackingLinks.reduce((sum, item) => sum + parseInt(item.margin), 0);
      if (totalMargin !== 100) {
        throw new Error(`Total margin must equal 100%. Current total: ${totalMargin}%`);
      }

      const distributedLinks = [];
      let remainingCount = totalCount;
      
      // Sort tracking links by margin (descending) to handle rounding better
      const sortedLinks = [...trackingLinks].sort((a, b) => parseInt(b.margin) - parseInt(a.margin));
      
      for (let i = 0; i < sortedLinks.length; i++) {
        const linkData = sortedLinks[i];
        const marginPercent = parseInt(linkData.margin);
        let linkCount;
        
        if (i === sortedLinks.length - 1) {
          // For the last link, use remaining count to ensure total matches
          linkCount = remainingCount;
        } else {
          // Calculate count based on margin percentage
          linkCount = Math.round((marginPercent / 100) * totalCount);
        }
        
        // Add the tracking link for calculated count
        for (let j = 0; j < linkCount; j++) {
          distributedLinks.push(linkData.link);
        }
        
        remainingCount -= linkCount;
      }
      
      // Shuffle the array to distribute links randomly rather than in blocks
      for (let i = distributedLinks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [distributedLinks[i], distributedLinks[j]] = [distributedLinks[j], distributedLinks[i]];
      }
      
      return distributedLinks;
    };

    // Fetch offer data with tracking links for each offer
    const offerIds = offers.map(offer => offer.offerId);
    const offerData = await Offer.find({ _id: { $in: offerIds } }).select('_id trackingLinks');
    
    // Create a map for quick lookup
    const offerTrackingMap = {};
    offerData.forEach(offer => {
      offerTrackingMap[offer._id.toString()] = offer.trackingLinks || [];
    });

    // Create all entries for all offers and employees
    const allEntriesToCreate = [];
    const offerSummary = [];

    for (const offer of offers) {
      const employeeSummary = [];
      
      // Calculate total entries for this offer
      const totalEntriesForOffer = offer.employees.reduce((sum, emp) => sum + emp.count, 0);
      
      // Get tracking links distribution for this offer
      const offerTrackingLinks = offerTrackingMap[offer.offerId] || [];
      let distributedLinks;
      
      try {
        distributedLinks = distributeTrackingLinks(offerTrackingLinks, totalEntriesForOffer);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Error with offer ${offer.offerId}: ${error.message}`
        });
      }
      
      let linkIndex = 0;
      
      for (const employee of offer.employees) {
        // Create entries for current employee in current offer
        for (let i = 0; i < employee.count; i++) {
          allEntriesToCreate.push({
            offerId: new mongoose.Types.ObjectId(offer.offerId),
            employeeId: new mongoose.Types.ObjectId(employee.empId),
            email: '',
            phone: '',
            password: '',
            amount: 0,
            paymentOption: 'credit_card',
            paymentStatus: 'pending',
            status: 'pending',
            trackingLink: distributedLinks[linkIndex] || '' // Assign tracking link based on distribution
          });
          linkIndex++;
        }

        // Track employee summary
        employeeSummary.push({
          employeeId: employee.empId,
          count: employee.count
        });
      }

      // Calculate actual distribution for response
      const trackingDistribution = offerTrackingLinks.map(linkData => {
        const marginPercent = parseInt(linkData.margin);
        const assignedCount = Math.round((marginPercent / 100) * totalEntriesForOffer);
        return {
          link: linkData.link,
          margin: `${marginPercent}%`,
          assignedCount: assignedCount
        };
      });

      // Track offer summary for response
      offerSummary.push({
        offerId: offer.offerId,
        employees: employeeSummary,
        totalCountForOffer: totalEntriesForOffer,
        trackingDistribution: trackingDistribution
      });
    }

    // Insert all entries at once
    const createdEntries = await EmpEnteredData.insertMany(allEntriesToCreate);

    // Group created entries by offer and employee for response
    const groupedEntries = {};
    let currentIndex = 0;

    for (const offer of offers) {
      const offerKey = offer.offerId;
      groupedEntries[offerKey] = {
        offerId: offer.offerId,
        employees: {},
        totalEntriesForOffer: 0
      };

      for (const employee of offer.employees) {
        const employeeEntries = createdEntries.slice(currentIndex, currentIndex + employee.count);
        
        groupedEntries[offerKey].employees[employee.empId] = {
          employeeId: employee.empId,
          count: employee.count,
          entries: employeeEntries
        };
        
        groupedEntries[offerKey].totalEntriesForOffer += employee.count;
        currentIndex += employee.count;
      }
    }

    // Return success response
    return res.status(201).json({
      success: true,
      message: `Successfully created ${totalEntries} entries across ${offers.length} offers with tracking links distributed by margins`,
      data: {
        totalEntries: createdEntries.length,
        totalOffers: offers.length,
        summary: offerSummary,
        groupedEntries: groupedEntries,
        allEntries: createdEntries
      }
    });

  } catch (error) {
    console.error('Error creating multiple offers with emp entries:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        error: error.message
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};


// Step 1: Preview Distribution Function
const previewTrackingDistribution = async (req, res) => {
  try {
    const { offers } = req.body;

    // Same validation as before
    if (!offers || !Array.isArray(offers) || offers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'offers array is required and cannot be empty'
      });
    }

    // Validate each offer object (same validation logic as before)
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      
      if (!offer.offerId) {
        return res.status(400).json({
          success: false,
          message: `Offer at index ${i}: offerId is required`
        });
      }

      if (!mongoose.Types.ObjectId.isValid(offer.offerId)) {
        return res.status(400).json({
          success: false,
          message: `Offer at index ${i}: offerId must be a valid ObjectId`
        });
      }

      if (!offer.employees || !Array.isArray(offer.employees) || offer.employees.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Offer at index ${i}: employees array is required and cannot be empty`
        });
      }

      // Validate employees (same as before)
      for (let j = 0; j < offer.employees.length; j++) {
        const employee = offer.employees[j];
        
        if (!employee.empId || !employee.count) {
          return res.status(400).json({
            success: false,
            message: `Offer at index ${i}, employee at index ${j}: empId and count are required`
          });
        }

        if (!mongoose.Types.ObjectId.isValid(employee.empId)) {
          return res.status(400).json({
            success: false,
            message: `Offer at index ${i}, employee at index ${j}: empId must be a valid ObjectId`
          });
        }

        if (!Number.isInteger(employee.count) || employee.count <= 0) {
          return res.status(400).json({
            success: false,
            message: `Offer at index ${i}, employee at index ${j}: count must be a positive integer`
          });
        }

        if (employee.count > 200) {
          return res.status(400).json({
            success: false,
            message: `Offer at index ${i}, employee at index ${j}: count cannot exceed 200`
          });
        }
      }
    }

    // Calculate total entries
    let totalEntries = 0;
    for (const offer of offers) {
      for (const employee of offer.employees) {
        totalEntries += employee.count;
      }
    }
    
    if (totalEntries > 500) {
      return res.status(400).json({
        success: false,
        message: `Total entries (${totalEntries}) cannot exceed 500`
      });
    }

    // Fetch offer data with tracking links and names
    const offerIds = offers.map(offer => offer.offerId);
    const offerData = await Offer.find({ _id: { $in: offerIds } }).select('_id offerName  trackingLinks');
    
    const offerDataMap = {};
    offerData.forEach(offer => {
      offerDataMap[offer._id.toString()] = {
        name: offer.offerName || 'Unknown Offer',
        trackingLinks: offer.trackingLinks || []
      };
    });

    // Fetch employee data with names
    const allEmployeeIds = [];
    offers.forEach(offer => {
      offer.employees.forEach(emp => {
        if (!allEmployeeIds.includes(emp.empId)) {
          allEmployeeIds.push(emp.empId);
        }
      });
    });

    const employeeData = await User.find({ _id: { $in: allEmployeeIds } }).select('_id name fullName firstName lastName username');
    
    const employeeDataMap = {};
    employeeData.forEach(emp => {
      // Try to get the best available name
      const fullName = emp.fullName || 
                      (emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : '') ||
                      emp.name || 
                      emp.username || 
                      'Unknown Employee';
      
      employeeDataMap[emp._id.toString()] = fullName;
    });

    // Calculate distribution preview for each offer
    const distributionPreview = [];

    for (const offer of offers) {
      const totalEntriesForOffer = offer.employees.reduce((sum, emp) => sum + emp.count, 0);
      const offerInfo = offerDataMap[offer.offerId];
      const offerTrackingLinks = offerInfo ? offerInfo.trackingLinks : [];
      
      // Calculate distribution for this offer
      const trackingDistribution = offerTrackingLinks.map(linkData => {
        const marginPercent = parseInt(linkData.margin);
        const calculatedCount = Math.round((marginPercent / 100) * totalEntriesForOffer);
        return {
          linkId: linkData._id || `link_${Math.random().toString(36).substr(2, 9)}`,
          link: linkData.link,
          margin: marginPercent,
          calculatedCount: calculatedCount,
          userAdjustedCount: calculatedCount
        };
      });

      // Validate total margins
      const totalMargin = offerTrackingLinks.reduce((sum, item) => sum + parseInt(item.margin), 0);
      
      distributionPreview.push({
        offerId: offer.offerId,
        offerName: offerInfo ? offerInfo.name : 'Unknown Offer', // Add offer name
        totalEntriesForOffer: totalEntriesForOffer,
        totalMargin: totalMargin,
        isValidMargin: totalMargin === 100,
        employees: offer.employees.map(emp => ({
          empId: emp.empId,
          empName: employeeDataMap[emp.empId] || 'Unknown Employee', // Add employee name
          count: emp.count
        })),
        trackingDistribution: trackingDistribution,
        hasTrackingLinks: offerTrackingLinks.length > 0
      });
    }

    // Return preview data
    return res.status(200).json({
      success: true,
      message: 'Distribution preview generated successfully',
      data: {
        totalEntries: totalEntries,
        totalOffers: offers.length,
        distributionPreview: distributionPreview,
        canProceed: distributionPreview.every(preview => preview.isValidMargin)
      }
    });

  } catch (error) {
    console.error('Error generating distribution preview:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Step 2: Confirm and Create Entries Function
const confirmAndCreateEntries = async (req, res) => {
  try {
    const { offers, confirmedDistribution } = req.body;

    // Validation
    if (!offers || !Array.isArray(offers) || offers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'offers array is required and cannot be empty'
      });
    }

    if (!confirmedDistribution || !Array.isArray(confirmedDistribution)) {
      return res.status(400).json({
        success: false,
        message: 'confirmedDistribution is required'
      });
    }

    // Validate confirmed distribution
    for (const distribution of confirmedDistribution) {
      if (!distribution.offerId || !distribution.trackingDistribution) {
        return res.status(400).json({
          success: false,
          message: 'Each distribution must have offerId and trackingDistribution'
        });
      }

      const totalUserAdjusted = distribution.trackingDistribution.reduce(
        (sum, track) => sum + (track.userAdjustedCount || 0), 0
      );
      
      if (totalUserAdjusted !== distribution.totalEntriesForOffer) {
        return res.status(400).json({
          success: false,
          message: `Offer ${distribution.offerId}: Total adjusted count (${totalUserAdjusted}) must equal total entries (${distribution.totalEntriesForOffer})`
        });
      }
    }

    // Get today's date range in Delhi timezone (IST)
    const delhiTimezone = 'Asia/Kolkata';
    const now = moment().tz(delhiTimezone);
    
    // Start of today in Delhi timezone
    const startOfDay = now.clone().startOf('day').toDate();
    
    // End of today in Delhi timezone
    const endOfDay = now.clone().endOf('day').toDate();
    
    console.log('Delhi Time - Current:', now.format('YYYY-MM-DD HH:mm:ss'));
    console.log('Delhi Time - Start of Day:', moment(startOfDay).tz(delhiTimezone).format('YYYY-MM-DD HH:mm:ss'));
    console.log('Delhi Time - End of Day:', moment(endOfDay).tz(delhiTimezone).format('YYYY-MM-DD HH:mm:ss'));

    // Function to create distribution array based on confirmed counts
    const createDistributionArray = (trackingDistribution) => {
      const distributedLinks = [];
      
      trackingDistribution.forEach(linkData => {
        const count = linkData.userAdjustedCount || 0;
        for (let i = 0; i < count; i++) {
          distributedLinks.push(linkData.link);
        }
      });
      
      // Shuffle the array for random distribution
      for (let i = distributedLinks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [distributedLinks[i], distributedLinks[j]] = [distributedLinks[j], distributedLinks[i]];
      }
      
      return distributedLinks;
    };

    // Function to check if entry has any filled fields
    const isEntryFilled = (entry) => {
      return entry.email || 
             entry.phone || 
             entry.password || 
             entry.amount > 0 || 
             entry.paymentStatus !== 'pending' || 
             entry.status !== 'pending';
    };

    // Create mapping for confirmed distributions
    const distributionMap = {};
    confirmedDistribution.forEach(dist => {
      distributionMap[dist.offerId] = dist;
    });

    // Get all existing entries for today for all offers
    const offerIds = offers.map(offer => new mongoose.Types.ObjectId(offer.offerId));
    const existingEntries = await EmpEnteredData.find({
      offerId: { $in: offerIds },
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });

    // Group existing entries by offerId and employeeId
    const existingEntriesMap = {};
    existingEntries.forEach(entry => {
      const offerKey = entry.offerId.toString();
      const empKey = entry.employeeId.toString();
      
      if (!existingEntriesMap[offerKey]) {
        existingEntriesMap[offerKey] = {};
      }
      if (!existingEntriesMap[offerKey][empKey]) {
        existingEntriesMap[offerKey][empKey] = [];
      }
      existingEntriesMap[offerKey][empKey].push(entry);
    });

    const allEntriesToCreate = [];
    const entriesToUpdate = [];
    const entriesToDelete = [];
    const processingSummary = [];

    for (const offer of offers) {
      const confirmedDist = distributionMap[offer.offerId];
      
      if (!confirmedDist) {
        return res.status(400).json({
          success: false,
          message: `No confirmed distribution found for offer ${offer.offerId}`
        });
      }

      // Create distribution array for this offer
      const distributedLinks = createDistributionArray(confirmedDist.trackingDistribution);
      let linkIndex = 0;

      const offerSummary = {
        offerId: offer.offerId,
        employees: [],
        created: 0,
        updated: 0,
        deleted: 0
      };

      for (const employee of offer.employees) {
        const existingEmployeeEntries = existingEntriesMap[offer.offerId]?.[employee.empId] || [];
        const currentCount = existingEmployeeEntries.length;
        const newCount = employee.count;

        const employeeSummary = {
          employeeId: employee.empId,
          currentCount,
          newCount,
          action: ''
        };

        if (currentCount === 0) {
          // No existing entries - create all new
          for (let i = 0; i < newCount; i++) {
            allEntriesToCreate.push({
              offerId: new mongoose.Types.ObjectId(offer.offerId),
              employeeId: new mongoose.Types.ObjectId(employee.empId),
              email: '',
              phone: '',
              password: '',
              amount: 0,
              paymentOption: null,
              screenshot: null,
              comment: null,
              paymentStatus: 'pending',
              status: 'pending',
              trackingLink: distributedLinks[linkIndex] || ''
            });
            linkIndex++;
          }
          employeeSummary.action = 'created_all';
          offerSummary.created += newCount;

        } else if (currentCount === newCount) {
          // Same count - check if tracking links need update
          let needsUpdate = false;
          const currentLinks = existingEmployeeEntries.map(entry => entry.trackingLink).sort();
          const newLinks = distributedLinks.slice(linkIndex, linkIndex + newCount).sort();
          
          if (JSON.stringify(currentLinks) !== JSON.stringify(newLinks)) {
            needsUpdate = true;
          }

          if (needsUpdate) {
            // Update tracking links for existing entries
            for (let i = 0; i < existingEmployeeEntries.length; i++) {
              entriesToUpdate.push({
                _id: existingEmployeeEntries[i]._id,
                trackingLink: distributedLinks[linkIndex] || ''
              });
              linkIndex++;
            }
            employeeSummary.action = 'updated_tracking';
            offerSummary.updated += currentCount;
          } else {
            employeeSummary.action = 'no_change';
            linkIndex += newCount; // Skip links for this employee
          }

        } else if (currentCount < newCount) {
          // Need to add more entries
          const toAdd = newCount - currentCount;
          
          // Update existing entries with new tracking links
          for (let i = 0; i < existingEmployeeEntries.length; i++) {
            entriesToUpdate.push({
              _id: existingEmployeeEntries[i]._id,
              trackingLink: distributedLinks[linkIndex] || ''
            });
            linkIndex++;
          }

          // Create additional entries
          for (let i = 0; i < toAdd; i++) {
            allEntriesToCreate.push({
              offerId: new mongoose.Types.ObjectId(offer.offerId),
              employeeId: new mongoose.Types.ObjectId(employee.empId),
              email: '',
              phone: '',
              password: '',
              amount: 0,
              paymentOption: null,
              screenshot: null,
              comment: null,
              paymentStatus: 'pending',
              status: 'pending',
              trackingLink: distributedLinks[linkIndex] || ''
            });
            linkIndex++;
          }
          
          employeeSummary.action = 'increased';
          offerSummary.updated += currentCount;
          offerSummary.created += toAdd;

        } else {
          // Need to remove entries (currentCount > newCount)
          const toRemove = currentCount - newCount;
          
          // Separate filled and unfilled entries
          const filledEntries = existingEmployeeEntries.filter(isEntryFilled);
          const unfilledEntries = existingEmployeeEntries.filter(entry => !isEntryFilled(entry));

          if (filledEntries.length > newCount) {
            // Cannot reduce because too many entries are filled
            return res.status(400).json({
              success: false,
              message: `Cannot reduce entries for offer ${offer.offerId}, employee ${employee.empId}. ${filledEntries.length} entries are filled but new count is ${newCount}`
            });
          }

          // Keep all filled entries and required number of unfilled entries
          const entriesToKeep = [...filledEntries];
          const unfilledToKeep = newCount - filledEntries.length;
          
          if (unfilledToKeep > 0) {
            entriesToKeep.push(...unfilledEntries.slice(0, unfilledToKeep));
          }

          // Mark remaining entries for deletion
          const entriesToDeleteForEmployee = existingEmployeeEntries.filter(
            entry => !entriesToKeep.some(kept => kept._id.toString() === entry._id.toString())
          );
          
          entriesToDelete.push(...entriesToDeleteForEmployee.map(entry => entry._id));

          // Update tracking links for kept entries
          for (let i = 0; i < entriesToKeep.length; i++) {
            entriesToUpdate.push({
              _id: entriesToKeep[i]._id,
              trackingLink: distributedLinks[linkIndex] || ''
            });
            linkIndex++;
          }

          employeeSummary.action = 'decreased';
          offerSummary.updated += entriesToKeep.length;
          offerSummary.deleted += entriesToDeleteForEmployee.length;
        }

        offerSummary.employees.push(employeeSummary);
      }

      processingSummary.push(offerSummary);
    }

    // Execute database operations
    const operations = [];
    
    // Create new entries
    if (allEntriesToCreate.length > 0) {
      operations.push(EmpEnteredData.insertMany(allEntriesToCreate));
    }

    // Update existing entries
    if (entriesToUpdate.length > 0) {
      const updatePromises = entriesToUpdate.map(update => 
        EmpEnteredData.findByIdAndUpdate(
          update._id,
          { trackingLink: update.trackingLink },
          { new: true }
        )
      );
      operations.push(Promise.all(updatePromises));
    }

    // Delete entries
    if (entriesToDelete.length > 0) {
      operations.push(EmpEnteredData.deleteMany({ _id: { $in: entriesToDelete } }));
    }

    const results = await Promise.all(operations);
    
    const createdEntries = allEntriesToCreate.length > 0 ? results[0] : [];
    const updatedEntries = entriesToUpdate.length > 0 ? results[allEntriesToCreate.length > 0 ? 1 : 0] : [];
    const deleteResult = entriesToDelete.length > 0 ? results[results.length - 1] : null;

    // Calculate totals
    const totalCreated = Array.isArray(createdEntries) ? createdEntries.length : 0;
    const totalUpdated = Array.isArray(updatedEntries) ? updatedEntries.length : 0;
    const totalDeleted = deleteResult ? deleteResult.deletedCount : 0;

    return res.status(200).json({
      success: true,
      message: `Successfully processed entries: ${totalCreated} created, ${totalUpdated} updated, ${totalDeleted} deleted`,
      data: {
        summary: {
          totalCreated,
          totalUpdated,
          totalDeleted,
          totalOffers: offers.length
        },
        processingSummary,
        createdEntries: createdEntries || [],
        updatedEntries: updatedEntries || [],
        deletedCount: totalDeleted
      }
    });

  } catch (error) {
    console.error('Error processing entries with confirmed distribution:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};



/// controller to get all employee entries
const getAllEmpEnteredData = async (req, res) => {
  try {
    const data = await EmpEnteredData.find()
      .populate('offerId', 'offerName description') // Adjust fields as per your Offer schema
      .populate('employeeId', 'fullName email') // Adjust fields as per your User schema
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      success: true,
      message: 'Employee entered data retrieved successfully',
      count: data.length,
      data: data
    });

  } catch (error) {
    console.error('Error fetching employee entered data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// const getAllEmpEnteredDataWithFiter = async (req, res) => {
//   try {
//     // Extract query parameters
//     const {
//       offerId,
//       empId,
//       employeeId, // Alternative parameter name
//       startDate,
//       endDate
//     } = req.query;

//     // Build filter object
//     const filter = {};

//     // Filter by offer ID
//     if (offerId) {
//       filter.offerId = offerId;
//     }

//     // Filter by employee ID (support both empId and employeeId parameter names)
//     if (empId || employeeId) {
//       filter.employeeId = empId || employeeId;
//     }

//     // Filter by date range using Delhi timezone
//     if (startDate || endDate) {
//       filter.createdAt = {};
      
//       if (startDate) {
//         // Parse start date in Delhi timezone and set to beginning of day
//         const start = moment.tz(startDate, 'Asia/Kolkata').startOf('day').toDate();
//         filter.createdAt.$gte = start;
//       }
      
//       if (endDate) {
//         // Parse end date in Delhi timezone and set to end of day
//         const end = moment.tz(endDate, 'Asia/Kolkata').endOf('day').toDate();
//         filter.createdAt.$lte = end;
//       }
//     }

//     // Execute query with filters
//     const data = await EmpEnteredData.find(filter)
//       .populate('offerId', 'offerName description') // Adjust fields as per your Offer schema
//       .populate('employeeId', 'fullName email') // Adjust fields as per your User schema
//       .sort({ createdAt: -1 }); // Sort by newest first

//     // Add Delhi timezone formatted dates to each record
//     const dataWithTimezone = data.map(item => {
//       const itemObj = item.toObject();
      
//       // Format createdAt in Delhi timezone
//       itemObj.createdAtDelhi = {
//         date: moment(item.createdAt).tz('Asia/Kolkata').format('DD-MM-YYYY'),
//         time: moment(item.createdAt).tz('Asia/Kolkata').format('hh:mm:ss A'),
//         fullDateTime: moment(item.createdAt).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'),
//         isoString: moment(item.createdAt).tz('Asia/Kolkata').format()
//       };
      
//       // Format updatedAt in Delhi timezone if it exists
//       if (item.updatedAt) {
//         itemObj.updatedAtDelhi = {
//           date: moment(item.updatedAt).tz('Asia/Kolkata').format('DD-MM-YYYY'),
//           time: moment(item.updatedAt).tz('Asia/Kolkata').format('hh:mm:ss A'),
//           fullDateTime: moment(item.updatedAt).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'),
//           isoString: moment(item.updatedAt).tz('Asia/Kolkata').format()
//         };
//       }
      
//       return itemObj;
//     });

//     // Format filter dates for response
//     const formattedFilters = { ...filter };
//     if (filter.createdAt) {
//       formattedFilters.createdAtRange = {};
//       if (filter.createdAt.$gte) {
//         formattedFilters.createdAtRange.from = moment(filter.createdAt.$gte).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A');
//       }
//       if (filter.createdAt.$lte) {
//         formattedFilters.createdAtRange.to = moment(filter.createdAt.$lte).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A');
//       }
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Employee entered data retrieved successfully',
//       count: dataWithTimezone.length,
//       filters: formattedFilters, // Include formatted filters for debugging
//       timezone: 'Asia/Kolkata (IST)',
//       data: dataWithTimezone
//     });

//   } catch (error) {
//     console.error('Error fetching employee entered data:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };
const getAllEmpEnteredDataWithFiter = async (req, res) => {
  try {
    // Extract query parameters
    const { 
      offerId,
      empId,
      employeeId,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = {};

    // Filter by offer ID
    if (offerId) {
      filter.offerId = offerId;
    }

    // Filter by employee ID
    if (empId || employeeId) {
      filter.employeeId = empId || employeeId;
    }

    // Filter by date range using Delhi timezone
    if (startDate || endDate) {
      filter.createdAt = {};
      
      if (startDate) {
        // Parse start date - try different formats
        let startMoment;
        
        // Try different date formats
        if (moment(startDate, 'YYYY-MM-DD', true).isValid()) {
          startMoment = moment.tz(startDate, 'YYYY-MM-DD', 'Asia/Kolkata');
        } else if (moment(startDate, 'DD-MM-YYYY', true).isValid()) {
          startMoment = moment.tz(startDate, 'DD-MM-YYYY', 'Asia/Kolkata');
        } else if (moment(startDate, 'MM-DD-YYYY', true).isValid()) {
          startMoment = moment.tz(startDate, 'MM-DD-YYYY', 'Asia/Kolkata');
        } else {
          // Fallback to moment's automatic parsing in IST timezone
          startMoment = moment.tz(startDate, 'Asia/Kolkata');
        }
        
        const start = startMoment.startOf('day').utc().toDate();
        filter.createdAt.$gte = start;
        
        console.log('Input startDate:', startDate);
        console.log('Parsed start (IST):', startMoment.format('DD-MM-YYYY hh:mm:ss A'));
        console.log('Start filter (UTC):', start);
        console.log('Start filter (IST):', moment(start).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'));
      }
      
      if (endDate) {
        // Parse end date - try different formats
        let endMoment;
        
        // Try different date formats
        if (moment(endDate, 'YYYY-MM-DD', true).isValid()) {
          endMoment = moment.tz(endDate, 'YYYY-MM-DD', 'Asia/Kolkata');
        } else if (moment(endDate, 'DD-MM-YYYY', true).isValid()) {
          endMoment = moment.tz(endDate, 'DD-MM-YYYY', 'Asia/Kolkata');
        } else if (moment(endDate, 'MM-DD-YYYY', true).isValid()) {
          endMoment = moment.tz(endDate, 'MM-DD-YYYY', 'Asia/Kolkata');
        } else {
          // Fallback to moment's automatic parsing in IST timezone
          endMoment = moment.tz(endDate, 'Asia/Kolkata');
        }
        
        const end = endMoment.endOf('day').utc().toDate();
        filter.createdAt.$lte = end;
        
        console.log('Input endDate:', endDate);
        console.log('Parsed end (IST):', endMoment.format('DD-MM-YYYY hh:mm:ss A'));
        console.log('End filter (UTC):', end);
        console.log('End filter (IST):', moment(end).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'));
      }
    }

    // Debug: Log the complete filter
    console.log('Complete filter:', JSON.stringify(filter, null, 2));

    // Execute query with filters - UPDATED TO INCLUDE PAYMENT DETAILS
    const data = await EmpEnteredData.find(filter)
      .populate('offerId', 'offerName description')
      .populate('employeeId', 'fullName email')
      .populate({
        path: 'paymentOption',
        model: 'Payment',
        select: 'name paymentType phoneNumber cardDetails upiDetails createdAt',
        // This will return null if paymentOption is null or not found
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 });

    // Debug: Log sample data dates and payment info
    if (data.length > 0) {
      console.log('Sample record dates and payment info:');
      data.slice(0, 3).forEach((item, index) => {
        console.log(`Record ${index + 1}:`, {
          createdAt: item.createdAt,
          createdAtIST: moment(item.createdAt).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'),
          paymentOption: item.paymentOption ? {
            id: item.paymentOption._id,
            name: item.paymentOption.name,
            type: item.paymentOption.paymentType
          } : null
        });
      });
    }

    // Add Delhi timezone formatted dates to each record + format payment details - SHOW ALL DETAILS
    const dataWithTimezone = data.map(item => {
      const itemObj = item.toObject();
      
      // Add timezone formatted dates
      itemObj.createdAtDelhi = {
        date: moment(item.createdAt).tz('Asia/Kolkata').format('DD-MM-YYYY'),
        time: moment(item.createdAt).tz('Asia/Kolkata').format('hh:mm:ss A'),
        fullDateTime: moment(item.createdAt).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'),
        isoString: moment(item.createdAt).tz('Asia/Kolkata').format()
      };
      
      if (item.updatedAt) {
        itemObj.updatedAtDelhi = {
          date: moment(item.updatedAt).tz('Asia/Kolkata').format('DD-MM-YYYY'),
          time: moment(item.updatedAt).tz('Asia/Kolkata').format('hh:mm:ss A'),
          fullDateTime: moment(item.updatedAt).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'),
          isoString: moment(item.updatedAt).tz('Asia/Kolkata').format()
        };
      }
      
      // Format payment details if available - SHOW ALL DETAILS WITHOUT MASKING
      if (item.paymentOption) {
        itemObj.paymentDetails = {
          id: item.paymentOption._id,
          name: item.paymentOption.name,
          paymentType: item.paymentOption.paymentType,
          phoneNumber: item.paymentOption.phoneNumber,
          
          // Include ALL card details if payment type is card
          ...(item.paymentOption.paymentType === 'card' && item.paymentOption.cardDetails && {
            cardDetails: {
              cardType: item.paymentOption.cardDetails.cardType,
              // Show COMPLETE card number - NO MASKING
              cardNumber: item.paymentOption.cardDetails.cardNumber,
              expirationDate: item.paymentOption.cardDetails.expirationDate,
              // Include CVV - COMPLETE DETAILS
              cvv: item.paymentOption.cardDetails.cvv,
              // Include any other card details
              cardHolderName: item.paymentOption.cardDetails.cardHolderName,
              billingAddress: item.paymentOption.cardDetails.billingAddress
            }
          }),
          
          // Include ALL UPI details if payment type is UPI
          ...(item.paymentOption.paymentType === 'upi' && item.paymentOption.upiDetails && {
            upiDetails: {
              upiId: item.paymentOption.upiDetails.upiId,
              bankName: item.paymentOption.upiDetails.bankName,
              // Show COMPLETE account number - NO MASKING
              accountNumber: item.paymentOption.upiDetails.accountNumber,
              ifscCode: item.paymentOption.upiDetails.ifscCode,
              // Include any other UPI details
              accountHolderName: item.paymentOption.upiDetails.accountHolderName,
              bankBranch: item.paymentOption.upiDetails.bankBranch,
              pin: item.paymentOption.upiDetails.pin,
              mpin: item.paymentOption.upiDetails.mpin
            }
          }),
          
          // Include ANY other payment type details
          ...(item.paymentOption.paymentType === 'netbanking' && item.paymentOption.netbankingDetails && {
            netbankingDetails: {
              bankName: item.paymentOption.netbankingDetails.bankName,
              accountNumber: item.paymentOption.netbankingDetails.accountNumber,
              userId: item.paymentOption.netbankingDetails.userId,
              password: item.paymentOption.netbankingDetails.password,
              transactionPassword: item.paymentOption.netbankingDetails.transactionPassword,
              customerId: item.paymentOption.netbankingDetails.customerId
            }
          }),
          
          ...(item.paymentOption.paymentType === 'wallet' && item.paymentOption.walletDetails && {
            walletDetails: {
              walletName: item.paymentOption.walletDetails.walletName,
              walletNumber: item.paymentOption.walletDetails.walletNumber,
              pin: item.paymentOption.walletDetails.pin,
              balance: item.paymentOption.walletDetails.balance
            }
          }),
          
          // Include ALL available payment option fields
          additionalDetails: {
            // Any extra fields that might exist
            ...Object.keys(item.paymentOption.toObject()).reduce((acc, key) => {
              if (!['_id', 'name', 'paymentType', 'phoneNumber', 'cardDetails', 'upiDetails', 'netbankingDetails', 'walletDetails', 'createdAt', 'updatedAt'].includes(key)) {
                acc[key] = item.paymentOption[key];
              }
              return acc;
            }, {})
          },
          
          createdAt: item.paymentOption.createdAt,
          createdAtDelhi: moment(item.paymentOption.createdAt).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'),
          updatedAt: item.paymentOption.updatedAt,
          updatedAtDelhi: item.paymentOption.updatedAt ? moment(item.paymentOption.updatedAt).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A') : null
        };
        
        // Remove the original paymentOption to avoid duplication
        delete itemObj.paymentOption;
      } else {
        // If no payment option, set paymentDetails to null
        itemObj.paymentDetails = null;
        delete itemObj.paymentOption;
      }
      
      return itemObj;
    });

    // Format filter dates for response
    const formattedFilters = { ...filter };
    if (filter.createdAt) {
      formattedFilters.createdAtRange = {};
      if (filter.createdAt.$gte) {
        formattedFilters.createdAtRange.from = moment(filter.createdAt.$gte).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A');
      }
      if (filter.createdAt.$lte) {
        formattedFilters.createdAtRange.to = moment(filter.createdAt.$lte).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A');
      }
    }

    // Count records with and without payment details
    const withPaymentDetails = dataWithTimezone.filter(item => item.paymentDetails !== null).length;
    const withoutPaymentDetails = dataWithTimezone.length - withPaymentDetails;

    // Enhanced statistics for different payment types
    const paymentTypeStats = {};
    dataWithTimezone.forEach(item => {
      if (item.paymentDetails && item.paymentDetails.paymentType) {
        const type = item.paymentDetails.paymentType;
        paymentTypeStats[type] = (paymentTypeStats[type] || 0) + 1;
      }
    });

    res.status(200).json({
      success: true,
      message: 'Employee entered data retrieved successfully with COMPLETE payment details',
      count: dataWithTimezone.length,
      paymentDetailsStats: {
        withPaymentDetails,
        withoutPaymentDetails,
        paymentTypeBreakdown: paymentTypeStats
      },
      filters: formattedFilters,
      timezone: 'Asia/Kolkata (IST)',
      dataVisibility: 'ALL_DETAILS_VISIBLE_NO_MASKING',
      securityNote: 'WARNING: All sensitive payment information is visible including card numbers, CVV, account numbers, PINs, etc.',
      data: dataWithTimezone
    });

  } catch (error) {
    console.error('Error fetching employee entered data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


// Controller to handle multiple entry count updates by ID only
const updateMultipleEntryCounts = async (req, res) => {
  try {
    const { updates } = req.body;

    // Handle both single object and array
    const updatesArray = Array.isArray(updates) ? updates : [updates];

    // Validate updates
    if (updatesArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates cannot be empty'
      });
    }

    // Validate each update object
    for (const update of updatesArray) {
      if (!update.id) {
        return res.status(400).json({
          success: false,
          message: 'Each update must have a valid id'
        });
      }

      if (!update.entryCount || update.entryCount < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each update must have valid entryCount (positive number)'
        });
      }
    }

    // Prepare bulk operations
    const bulkOps = updatesArray.map(update => ({
      updateOne: {
        filter: { _id: update.id },
        update: { entryCount: update.entryCount },
        runValidators: true
      }
    }));

    // Execute bulk update
    const result = await EmployeeWiseAssignWork.bulkWrite(bulkOps);

    // Get updated documents to return in response
    const updatedIds = updatesArray.map(update => update.id);
    const updatedAssignments = await EmployeeWiseAssignWork.find({
      _id: { $in: updatedIds }
    });

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} out of ${updatesArray.length} entries`,
      data: {
        totalRequested: updatesArray.length,
        totalModified: result.modifiedCount,
        totalMatched: result.matchedCount,
        updatedAssignments: updatedAssignments
      }
    });

  } catch (error) {
    console.error('Error updating multiple entry counts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



// const updateEntry = async (req, res) => {
//   console.log('=== UPDATE ENTRY FUNCTION STARTED ===');
//   console.log('Timestamp:', new Date().toISOString());
  
//   try {
//     // Get id from URL parameters
//     const { id } = req.params;
//     const updateData = req.body;

//     // Handle uploaded file (if any)
//     if (req.file) {
//       console.log('📸 File Upload Detected:');
//       console.log('- Original name:', req.file.originalname);
//       console.log('- Saved filename:', req.file.filename);
//       console.log('- File path:', req.file.path);
//       console.log('- File size:', req.file.size, 'bytes');
//       console.log('- MIME type:', req.file.mimetype);
      
//       // Construct full URL dynamically
//       const protocol = req.protocol; // http or https
//       const host = req.get('host'); // localhost:3000, example.com, etc.
//       const baseUrl = `${protocol}://${host}`;
//       const fullScreenshotUrl = `${baseUrl}/uploads/products/${req.file.filename}`;
      
//       // Add the full URL to updateData
//       updateData.screenshot = fullScreenshotUrl;
      
//       console.log('✅ Screenshot URL Details:');
//       console.log('- Protocol:', protocol);
//       console.log('- Host:', host);
//       console.log('- Base URL:', baseUrl);
//       console.log('- Full Screenshot URL:', fullScreenshotUrl);
//     }
//     console.log('Request Details:');
//     console.log('- Method:', req.method);
//     console.log('- URL:', req.originalUrl);
//     console.log('- Params:', JSON.stringify(req.params));
//     console.log('- Body:', JSON.stringify(updateData, null, 2));
//     console.log('- Headers:', JSON.stringify(req.headers, null, 2));
//      console.log('- File uploaded:', req.file ? 'Yes' : 'No');

//     // Check if id exists
//     if (!id) {
//       console.log('❌ ERROR: Entry ID is missing');
//       return res.status(400).json({
//         success: false,
//         message: 'Entry ID is required'
//       });
//     }

//     console.log('✅ ID Check passed');
//     console.log('Received ID:', id);
//     console.log('ID Length:', id.length);
//     console.log('ID Type:', typeof id);

//     // Validate ObjectId
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       console.log('❌ ERROR: Invalid ObjectId format');
//       console.log('Invalid ID:', id);
//       console.log('ObjectId validation failed');
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid entry ID format'
//       });
//     }

//     console.log('✅ ObjectId validation passed');

//     // Log original update data before modifications
//     console.log('Original Update Data:', JSON.stringify(updateData, null, 2));

//     // Remove fields that shouldn't be updated directly
//     const beforeCleanup = { ...updateData };
//     delete updateData._id;
//     delete updateData.createdAt;
//     delete updateData.updatedAt;
    
//     console.log('Data Cleanup:');
//     console.log('- Before cleanup:', JSON.stringify(beforeCleanup, null, 2));
//     console.log('- After cleanup:', JSON.stringify(updateData, null, 2));
//     console.log('- Removed fields: _id, createdAt, updatedAt');

//     // Validate enum values if present
//     console.log('=== STARTING VALIDATIONS ===');

//     // Modified Screenshot validation to handle both file uploads and URL strings
//     if (updateData.screenshot !== undefined) {
//       console.log('Validating screenshot:', updateData.screenshot);
//       console.log('Screenshot type:', typeof updateData.screenshot);
      
//       if (updateData.screenshot === null || updateData.screenshot === '') {
//         console.log('✅ Screenshot is null/empty - allowed');
//       } else {
//         // Check if it's a full URL from file upload or external URL
//         const isFullUrl = updateData.screenshot.startsWith('http://') || updateData.screenshot.startsWith('https://');
//         const isRelativePath = updateData.screenshot.startsWith('/uploads/products/');
        
//         if (isFullUrl || isRelativePath) {
//           console.log('✅ Screenshot is valid URL/path - validation passed');
          
//           // If it's a relative path from old data, optionally convert to full URL
//           if (isRelativePath && !isFullUrl) {
//             const protocol = req.protocol;
//             const host = req.get('host');
//             const fullUrl = `${protocol}://${host}${updateData.screenshot}`;
//             updateData.screenshot = fullUrl;
//             console.log('🔄 Converted relative path to full URL:', fullUrl);
//           }
//         } else {
//           // Check if it's a valid image URL format for external URLs
//           const screenshotRegex = /^(https?:\/\/).*\.(jpg|jpeg|png|gif|webp|bmp)$/i;
          
//           if (!screenshotRegex.test(updateData.screenshot)) {
//             console.log('❌ ERROR: Invalid screenshot format');
//             console.log('Received:', updateData.screenshot);
//             return res.status(400).json({
//               success: false,
//               message: 'Screenshot must be a valid image URL with supported image extension'
//             });
//           } else {
//             console.log('✅ Screenshot URL format validation passed');
//           }
//         }
        
//         // Security validation (for external URLs only)
//         if (!updateData.screenshot.includes(req.get('host'))) {
//           const suspiciousPatterns = [
//             /<script/i,
//             /javascript:/i,
//             /data:(?!image)/i,
//             /vbscript:/i
//           ];
          
//           if (suspiciousPatterns.some(pattern => pattern.test(updateData.screenshot))) {
//             console.log('❌ ERROR: Screenshot contains suspicious content');
//             return res.status(400).json({
//               success: false,
//               message: 'Invalid screenshot content detected'
//             });
//           }
//         }
//         console.log('✅ Screenshot security validation passed');
//       }
//     } else {
//       console.log('⏭️ Skipping screenshot validation (not provided)');
//     }

//     // Updated paymentOption validation (now accepts ObjectId references)
//     if (updateData.paymentOption) {
//       console.log('Validating paymentOption:', updateData.paymentOption);
//       console.log('PaymentOption type:', typeof updateData.paymentOption);
      
//       // Check if it's a valid ObjectId (for Payment schema reference)
//       if (mongoose.Types.ObjectId.isValid(updateData.paymentOption)) {
//         console.log('✅ Payment option is valid ObjectId reference');
//         console.log('Payment ID:', updateData.paymentOption);
        
//         // Optional: Verify that the payment method exists in database
//         try {
//           const Payment = require('../models/Payment'); // Adjust path as needed
//           const paymentExists = await Payment.findById(updateData.paymentOption);
//           if (!paymentExists) {
//             console.log('❌ ERROR: Referenced payment method not found');
//             console.log('Payment ID:', updateData.paymentOption);
//             return res.status(400).json({
//               success: false,
//               message: 'Referenced payment method not found'
//             });
//           }
//           console.log('✅ Payment method reference validated');
//           console.log('Payment method details:', {
//             id: paymentExists._id,
//             name: paymentExists.name,
//             paymentType: paymentExists.paymentType
//           });
//         } catch (paymentCheckError) {
//           console.log('⚠️ Warning: Could not verify payment method existence');
//           console.log('Payment check error:', paymentCheckError.message);
//           // Continue without blocking - let mongoose handle the reference validation
//         }
//       } else {
//         // If it's not an ObjectId, check if it's one of the old enum values for backward compatibility
//         const legacyPaymentOptions = ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'upi', 'wallet', 'cash'];
//         console.log('Checking against legacy payment options:', legacyPaymentOptions);
        
//         if (!legacyPaymentOptions.includes(updateData.paymentOption)) {
//           console.log('❌ ERROR: Invalid payment option');
//           console.log('Received:', updateData.paymentOption);
//           console.log('Expected: Valid ObjectId reference to Payment schema or legacy enum value');
//           return res.status(400).json({
//             success: false,
//             message: 'Invalid payment option. Must be a valid payment method reference.'
//           });
//         }
//         console.log('✅ Legacy payment option validation passed');
//       }
//     } else {
//       console.log('⏭️ Skipping paymentOption validation (not provided or null)');
//     }

//     if (updateData.paymentStatus) {
//       console.log('Validating paymentStatus:', updateData.paymentStatus);
//       const validPaymentStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'];
//       console.log('Valid payment statuses:', validPaymentStatuses);
      
//       if (!validPaymentStatuses.includes(updateData.paymentStatus)) {
//         console.log('❌ ERROR: Invalid payment status');
//         console.log('Received:', updateData.paymentStatus);
//         console.log('Expected one of:', validPaymentStatuses);
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid payment status'
//         });
//       }
//       console.log('✅ Payment status validation passed');
//     } else {
//       console.log('⏭️ Skipping paymentStatus validation (not provided)');
//     }

//     if (updateData.status) {
//       console.log('Validating status:', updateData.status);
//       const validStatuses = ['active', 'inactive', 'pending', 'approved', 'rejected', 'suspended', 'completed'];
//       console.log('Valid statuses:', validStatuses);
      
//       if (!validStatuses.includes(updateData.status)) {
//         console.log('❌ ERROR: Invalid status');
//         console.log('Received:', updateData.status);
//         console.log('Expected one of:', validStatuses);
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid status'
//         });
//       }
//       console.log('✅ Status validation passed');
//     } else {
//       console.log('⏭️ Skipping status validation (not provided)');
//     }

//     // Email validation
//     if (updateData.email !== undefined) {
//       console.log('Validating email:', updateData.email);
//       if (updateData.email && updateData.email.trim() !== '') {
//         const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
//         if (!emailRegex.test(updateData.email)) {
//           console.log('❌ ERROR: Invalid email format');
//           console.log('Received email:', updateData.email);
//           return res.status(400).json({
//             success: false,
//             message: 'Please enter a valid email address'
//           });
//         }
//         console.log('✅ Email validation passed');
//       } else {
//         console.log('✅ Email is empty - allowed');
//       }
//     } else {
//       console.log('⏭️ Skipping email validation (not provided)');
//     }

//     // Phone validation
//     if (updateData.phone !== undefined) {
//       console.log('Validating phone:', updateData.phone);
//       if (updateData.phone && updateData.phone.trim() !== '') {
//         const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
//         if (!phoneRegex.test(updateData.phone)) {
//           console.log('❌ ERROR: Invalid phone format');
//           console.log('Received phone:', updateData.phone);
//           return res.status(400).json({
//             success: false,
//             message: 'Please enter a valid phone number'
//           });
//         }
//         console.log('✅ Phone validation passed');
//       } else {
//         console.log('✅ Phone is empty - allowed');
//       }
//     } else {
//       console.log('⏭️ Skipping phone validation (not provided)');
//     }

//     // Validate amount if present
//     if (updateData.amount !== undefined) {
//       console.log('Validating amount:', updateData.amount);
//       console.log('Amount type:', typeof updateData.amount);
//       console.log('Amount value:', updateData.amount);
      
//       if (updateData.amount < 0) {
//         console.log('❌ ERROR: Amount cannot be negative');
//         console.log('Received amount:', updateData.amount);
//         return res.status(400).json({
//           success: false,
//           message: 'Amount cannot be negative'
//         });
//       }
//       console.log('✅ Amount validation passed');
//     } else {
//       console.log('⏭️ Skipping amount validation (not provided)');
//     }

//     // Tracking link validation
//     if (updateData.trackingLink !== undefined) {
//       console.log('Validating trackingLink:', updateData.trackingLink);
//       if (updateData.trackingLink && updateData.trackingLink.trim() !== '') {
//         // Basic URL validation for tracking links
//         try {
//           new URL(updateData.trackingLink);
//           console.log('✅ Tracking link validation passed');
//         } catch (urlError) {
//           console.log('❌ ERROR: Invalid tracking link URL');
//           console.log('Received tracking link:', updateData.trackingLink);
//           return res.status(400).json({
//             success: false,
//             message: 'Tracking link must be a valid URL'
//           });
//         }
//       } else {
//         console.log('✅ Tracking link is empty - allowed');
//       }
//     } else {
//       console.log('⏭️ Skipping tracking link validation (not provided)');
//     }

//     console.log('=== ALL VALIDATIONS PASSED - PROCEEDING TO DATABASE UPDATE ===');

//     // Prepare update options
//     const updateOptions = {
//       new: true, // Return updated document
//       runValidators: true, // Run schema validators
//       context: 'query' // Required for custom validators
//     };

//     console.log('Database Update Details:');
//     console.log('- Target ID:', id);
//     console.log('- Update Data:', JSON.stringify(updateData, null, 2));
//     console.log('- Update Options:', JSON.stringify(updateOptions, null, 2));
//     console.log('- Model:', 'EmpEnteredData');

//     // Special logging for screenshot updates
//     if (updateData.screenshot !== undefined) {
//       console.log('📸 Screenshot Update Details:');
//       console.log('- Screenshot field being updated');
//       console.log('- New screenshot value:', updateData.screenshot);
//       console.log('- Is full URL:', updateData.screenshot.startsWith('http'));
//     }

//     console.log('🔄 Executing findByIdAndUpdate...');
//     const updateStartTime = Date.now();

//     // Find and update the entry
//     const updatedEntry = await EmpEnteredData.findByIdAndUpdate(
//       id,
//       updateData,
//       updateOptions
//     );

//     const updateEndTime = Date.now();
//     const updateDuration = updateEndTime - updateStartTime;

//     console.log('Database Update Results:');
//     console.log('- Update Duration:', updateDuration + 'ms');
//     console.log('- Entry Found:', updatedEntry ? 'Yes' : 'No');

//     if (!updatedEntry) {
//       console.log('❌ ERROR: Entry not found in database');
//       console.log('Searched ID:', id);
//       console.log('No document found with this ID');
//       return res.status(404).json({
//         success: false,
//         message: 'Entry not found'
//       });
//     }

//     console.log('✅ Entry updated successfully');
//     console.log('Updated Entry Details:');
//     console.log('- ID:', updatedEntry._id);
//     console.log('- Updated Fields:', Object.keys(updateData));
    
//     // Special logging for screenshot updates
//     // Special logging for screenshot updates
//     if (updateData.screenshot !== undefined) {
//       console.log('📸 Screenshot Update Successful:');
//       console.log('- New screenshot in DB:', updatedEntry.screenshot);
//       if (req.file) {
//         console.log('- File saved as:', req.file.filename);
//         console.log('- Full file path:', req.file.path);
//         console.log('- Full URL:', updatedEntry.screenshot);
//       }
//     }
    
//     console.log('- Full Updated Entry:', JSON.stringify(updatedEntry, null, 2));

//     const response = {
//       success: true,
//       message: 'Entry updated successfully',
//       data: updatedEntry
//     };

//     console.log('=== SENDING SUCCESS RESPONSE ===');
//     console.log('Response:', JSON.stringify(response, null, 2));
//     console.log('Status Code: 200');

//     res.status(200).json(response);

//   } catch (error) {
//     console.log('=== ERROR OCCURRED ===');
//     console.error('Error Details:');
//     console.error('- Error Name:', error.name);
//     console.error('- Error Message:', error.message);
//     console.error('- Error Stack:', error.stack);
    
//     if (error.errors) {
//       console.error('- Validation Errors:', JSON.stringify(error.errors, null, 2));
//     }
//     // Handle multer errors
//     if (error.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({
//         success: false,
//         message: 'File too large'
//       });
//     }
    
//     if (error.message === 'Only image files are allowed') {
//       return res.status(400).json({
//         success: false,
//         message: 'Only image files are allowed'
//       });
//     }
//     // Handle validation errors
//     if (error.name === 'ValidationError') {
//       console.log('❌ Handling ValidationError');
//       const validationErrors = Object.values(error.errors).map(err => {
//         console.log('Validation Error Detail:', {
//           field: err.path,
//           message: err.message,
//           value: err.value,
//           kind: err.kind
//         });
//         return err.message;
//       });
      
//       const validationResponse = {
//         success: false,
//         message: 'Validation error',
//         errors: validationErrors
//       };
      
//       console.log('Sending validation error response:', JSON.stringify(validationResponse, null, 2));
//       console.log('Status Code: 400');
      
//       return res.status(400).json(validationResponse);
//     }

//     // Handle cast errors
//     if (error.name === 'CastError') {
//       console.log('❌ Handling CastError');
//       console.log('Cast Error Details:', {
//         path: error.path,
//         value: error.value,
//         kind: error.kind,
//         reason: error.reason
//       });
      
//       const castErrorResponse = {
//         success: false,
//         message: 'Invalid data format'
//       };
      
//       console.log('Sending cast error response:', JSON.stringify(castErrorResponse, null, 2));
//       console.log('Status Code: 400');
      
//       return res.status(400).json(castErrorResponse);
//     }

//     // Handle general server errors
//     console.log('❌ Handling Internal Server Error');
//     const serverErrorResponse = {
//       success: false,
//       message: 'Internal server error'
//     };
    
//     console.log('Sending server error response:', JSON.stringify(serverErrorResponse, null, 2));
//     console.log('Status Code: 500');
    
//     res.status(500).json(serverErrorResponse);
//   } finally {
//     console.log('=== UPDATE ENTRY FUNCTION COMPLETED ===');
//     console.log('End Timestamp:', new Date().toISOString());
//     console.log('==========================================\n');
//   }
// };

const updateEntry = async (req, res) => {
  console.log('=== UPDATE ENTRY FUNCTION STARTED ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Get id from URL parameters
    const { id } = req.params;
    const updateData = req.body;

    // Handle uploaded file (if any)
    if (req.file) {
      console.log('📸 File Upload Detected:');
      console.log('- Original name:', req.file.originalname);
      console.log('- Saved filename:', req.file.filename);
      console.log('- File path:', req.file.path);
      console.log('- File size:', req.file.size, 'bytes');
      console.log('- MIME type:', req.file.mimetype);
      
      // Construct full URL dynamically
      const protocol = req.protocol; // http or https
      const host = req.get('host'); // localhost:3000, example.com, etc.
      const baseUrl = `${protocol}://${host}`;
      const fullScreenshotUrl = `${baseUrl}/uploads/products/${req.file.filename}`;
      
      // Add the full URL to updateData
      updateData.screenshot = fullScreenshotUrl;
      
      console.log('✅ Screenshot URL Details:');
      console.log('- Protocol:', protocol);
      console.log('- Host:', host);
      console.log('- Base URL:', baseUrl);
      console.log('- Full Screenshot URL:', fullScreenshotUrl);
    }
    console.log('Request Details:');
    console.log('- Method:', req.method);
    console.log('- URL:', req.originalUrl);
    console.log('- Params:', JSON.stringify(req.params));
    console.log('- Body:', JSON.stringify(updateData, null, 2));
    console.log('- Headers:', JSON.stringify(req.headers, null, 2));
     console.log('- File uploaded:', req.file ? 'Yes' : 'No');

    // Check if id exists
    if (!id) {
      console.log('❌ ERROR: Entry ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Entry ID is required'
      });
    }

    console.log('✅ ID Check passed');
    console.log('Received ID:', id);
    console.log('ID Length:', id.length);
    console.log('ID Type:', typeof id);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('❌ ERROR: Invalid ObjectId format');
      console.log('Invalid ID:', id);
      console.log('ObjectId validation failed');
      return res.status(400).json({
        success: false,
        message: 'Invalid entry ID format'
      });
    }

    console.log('✅ ObjectId validation passed');

    // Log original update data before modifications
    console.log('Original Update Data:', JSON.stringify(updateData, null, 2));

    // Remove fields that shouldn't be updated directly
    const beforeCleanup = { ...updateData };
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    console.log('Data Cleanup:');
    console.log('- Before cleanup:', JSON.stringify(beforeCleanup, null, 2));
    console.log('- After cleanup:', JSON.stringify(updateData, null, 2));
    console.log('- Removed fields: _id, createdAt, updatedAt');

    // Validate enum values if present
    console.log('=== STARTING VALIDATIONS ===');

    // Modified Screenshot validation to handle both file uploads and URL strings
    if (updateData.screenshot !== undefined) {
      console.log('Validating screenshot:', updateData.screenshot);
      console.log('Screenshot type:', typeof updateData.screenshot);
      
      if (updateData.screenshot === null || updateData.screenshot === '') {
        console.log('✅ Screenshot is null/empty - allowed');
      } else {
        // Check if it's a full URL from file upload or external URL
        const isFullUrl = updateData.screenshot.startsWith('http://') || updateData.screenshot.startsWith('https://');
        const isRelativePath = updateData.screenshot.startsWith('/uploads/products/');
        
        if (isFullUrl || isRelativePath) {
          console.log('✅ Screenshot is valid URL/path - validation passed');
          
          // If it's a relative path from old data, optionally convert to full URL
          if (isRelativePath && !isFullUrl) {
            const protocol = req.protocol;
            const host = req.get('host');
            const fullUrl = `${protocol}://${host}${updateData.screenshot}`;
            updateData.screenshot = fullUrl;
            console.log('🔄 Converted relative path to full URL:', fullUrl);
          }
        } else {
          // Check if it's a valid image URL format for external URLs
          const screenshotRegex = /^(https?:\/\/).*\.(jpg|jpeg|png|gif|webp|bmp)$/i;
          
          if (!screenshotRegex.test(updateData.screenshot)) {
            console.log('❌ ERROR: Invalid screenshot format');
            console.log('Received:', updateData.screenshot);
            return res.status(400).json({
              success: false,
              message: 'Screenshot must be a valid image URL with supported image extension'
            });
          } else {
            console.log('✅ Screenshot URL format validation passed');
          }
        }
        
        // Security validation (for external URLs only)
        if (!updateData.screenshot.includes(req.get('host'))) {
          const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /data:(?!image)/i,
            /vbscript:/i
          ];
          
          if (suspiciousPatterns.some(pattern => pattern.test(updateData.screenshot))) {
            console.log('❌ ERROR: Screenshot contains suspicious content');
            return res.status(400).json({
              success: false,
              message: 'Invalid screenshot content detected'
            });
          }
        }
        console.log('✅ Screenshot security validation passed');
      }
    } else {
      console.log('⏭️ Skipping screenshot validation (not provided)');
    }

    // Updated paymentOption validation (now accepts ObjectId references)
    if (updateData.paymentOption) {
      console.log('Validating paymentOption:', updateData.paymentOption);
      console.log('PaymentOption type:', typeof updateData.paymentOption);
      
      // Check if it's a valid ObjectId (for Payment schema reference)
      if (mongoose.Types.ObjectId.isValid(updateData.paymentOption)) {
        console.log('✅ Payment option is valid ObjectId reference');
        console.log('Payment ID:', updateData.paymentOption);
        
        // Optional: Verify that the payment method exists in database
        try {
          const Payment = require('../models/Payment'); // Adjust path as needed
          const paymentExists = await Payment.findById(updateData.paymentOption);
          if (!paymentExists) {
            console.log('❌ ERROR: Referenced payment method not found');
            console.log('Payment ID:', updateData.paymentOption);
            return res.status(400).json({
              success: false,
              message: 'Referenced payment method not found'
            });
          }
          console.log('✅ Payment method reference validated');
          console.log('Payment method details:', {
            id: paymentExists._id,
            name: paymentExists.name,
            paymentType: paymentExists.paymentType
          });
        } catch (paymentCheckError) {
          console.log('⚠️ Warning: Could not verify payment method existence');
          console.log('Payment check error:', paymentCheckError.message);
          // Continue without blocking - let mongoose handle the reference validation
        }
      } else {
        // If it's not an ObjectId, check if it's one of the old enum values for backward compatibility
        const legacyPaymentOptions = ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'upi', 'wallet', 'cash'];
        console.log('Checking against legacy payment options:', legacyPaymentOptions);
        
        if (!legacyPaymentOptions.includes(updateData.paymentOption)) {
          console.log('❌ ERROR: Invalid payment option');
          console.log('Received:', updateData.paymentOption);
          console.log('Expected: Valid ObjectId reference to Payment schema or legacy enum value');
          return res.status(400).json({
            success: false,
            message: 'Invalid payment option. Must be a valid payment method reference.'
          });
        }
        console.log('✅ Legacy payment option validation passed');
      }
    } else {
      console.log('⏭️ Skipping paymentOption validation (not provided or null)');
    }

    if (updateData.paymentStatus) {
      console.log('Validating paymentStatus:', updateData.paymentStatus);
      const validPaymentStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'];
      console.log('Valid payment statuses:', validPaymentStatuses);
      
      if (!validPaymentStatuses.includes(updateData.paymentStatus)) {
        console.log('❌ ERROR: Invalid payment status');
        console.log('Received:', updateData.paymentStatus);
        console.log('Expected one of:', validPaymentStatuses);
        return res.status(400).json({
          success: false,
          message: 'Invalid payment status'
        });
      }
      console.log('✅ Payment status validation passed');
    } else {
      console.log('⏭️ Skipping paymentStatus validation (not provided)');
    }

    if (updateData.status) {
      console.log('Validating status:', updateData.status);
      const validStatuses = ['active', 'inactive', 'pending', 'approved', 'rejected', 'suspended', 'completed'];
      console.log('Valid statuses:', validStatuses);
      
      if (!validStatuses.includes(updateData.status)) {
        console.log('❌ ERROR: Invalid status');
        console.log('Received:', updateData.status);
        console.log('Expected one of:', validStatuses);
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }
      console.log('✅ Status validation passed');
    } else {
      console.log('⏭️ Skipping status validation (not provided)');
    }

    // Email validation
    if (updateData.email !== undefined) {
      console.log('Validating email:', updateData.email);
      if (updateData.email && updateData.email.trim() !== '') {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(updateData.email)) {
          console.log('❌ ERROR: Invalid email format');
          console.log('Received email:', updateData.email);
          return res.status(400).json({
            success: false,
            message: 'Please enter a valid email address'
          });
        }
        console.log('✅ Email validation passed');
      } else {
        console.log('✅ Email is empty - allowed');
      }
    } else {
      console.log('⏭️ Skipping email validation (not provided)');
    }

    // Phone validation
    if (updateData.phone !== undefined) {
      console.log('Validating phone:', updateData.phone);
      if (updateData.phone && updateData.phone.trim() !== '') {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(updateData.phone)) {
          console.log('❌ ERROR: Invalid phone format');
          console.log('Received phone:', updateData.phone);
          return res.status(400).json({
            success: false,
            message: 'Please enter a valid phone number'
          });
        }
        console.log('✅ Phone validation passed');
      } else {
        console.log('✅ Phone is empty - allowed');
      }
    } else {
      console.log('⏭️ Skipping phone validation (not provided)');
    }

    // Validate amount if present
    if (updateData.amount !== undefined) {
      console.log('Validating amount:', updateData.amount);
      console.log('Amount type:', typeof updateData.amount);
      console.log('Amount value:', updateData.amount);
      
      if (updateData.amount < 0) {
        console.log('❌ ERROR: Amount cannot be negative');
        console.log('Received amount:', updateData.amount);
        return res.status(400).json({
          success: false,
          message: 'Amount cannot be negative'
        });
      }
      console.log('✅ Amount validation passed');
    } else {
      console.log('⏭️ Skipping amount validation (not provided)');
    }

    // Tracking link validation
    if (updateData.trackingLink !== undefined) {
      console.log('Validating trackingLink:', updateData.trackingLink);
      if (updateData.trackingLink && updateData.trackingLink.trim() !== '') {
        // Basic URL validation for tracking links
        try {
          new URL(updateData.trackingLink);
          console.log('✅ Tracking link validation passed');
        } catch (urlError) {
          console.log('❌ ERROR: Invalid tracking link URL');
          console.log('Received tracking link:', updateData.trackingLink);
          return res.status(400).json({
            success: false,
            message: 'Tracking link must be a valid URL'
          });
        }
      } else {
        console.log('✅ Tracking link is empty - allowed');
      }
    } else {
      console.log('⏭️ Skipping tracking link validation (not provided)');
    }

    // Comment validation (NEW FIELD)
    if (updateData.comment !== undefined) {
      console.log('Validating comment:', updateData.comment);
      console.log('Comment type:', typeof updateData.comment);
      console.log('Comment length:', updateData.comment ? updateData.comment.length : 0);
      
      if (updateData.comment === null || updateData.comment === '') {
        console.log('✅ Comment is null/empty - allowed');
      } else {
        // Trim whitespace
        updateData.comment = updateData.comment.toString().trim();
        console.log('Comment after trimming:', updateData.comment);
        
        // Length validation
        const MAX_COMMENT_LENGTH = 1000; // Adjust as needed
        if (updateData.comment.length > MAX_COMMENT_LENGTH) {
          console.log('❌ ERROR: Comment exceeds maximum length');
          console.log('Comment length:', updateData.comment.length);
          console.log('Maximum allowed:', MAX_COMMENT_LENGTH);
          return res.status(400).json({
            success: false,
            message: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`
          });
        }
        
        // Content validation - Check for potentially harmful content
        const suspiciousPatterns = [
          /<script/i,
          /<iframe/i,
          /javascript:/i,
          /vbscript:/i,
          /onload=/i,
          /onclick=/i,
          /onerror=/i
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(updateData.comment))) {
          console.log('❌ ERROR: Comment contains suspicious content');
          console.log('Received comment:', updateData.comment);
          return res.status(400).json({
            success: false,
            message: 'Comment contains invalid content'
          });
        }
        
        // Optional: Basic profanity filter (you can add more sophisticated filtering)
        const profanityWords = ['badword1', 'badword2']; // Add actual words you want to filter
        const commentLower = updateData.comment.toLowerCase();
        const containsProfanity = profanityWords.some(word => commentLower.includes(word));
        
        if (containsProfanity) {
          console.log('⚠️ Warning: Comment contains potentially inappropriate content');
          console.log('Comment content:', updateData.comment);
          // You can either reject or flag for review
          // For now, we'll allow it but log it
        }
        
        console.log('✅ Comment validation passed');
        console.log('Final comment:', updateData.comment);
      }
    } else {
      console.log('⏭️ Skipping comment validation (not provided)');
    }

    console.log('=== ALL VALIDATIONS PASSED - PROCEEDING TO DATABASE UPDATE ===');

    // Prepare update options
    const updateOptions = {
      new: true, // Return updated document
      runValidators: true, // Run schema validators
      context: 'query' // Required for custom validators
    };

    console.log('Database Update Details:');
    console.log('- Target ID:', id);
    console.log('- Update Data:', JSON.stringify(updateData, null, 2));
    console.log('- Update Options:', JSON.stringify(updateOptions, null, 2));
    console.log('- Model:', 'EmpEnteredData');

    // Special logging for screenshot updates
    if (updateData.screenshot !== undefined) {
      console.log('📸 Screenshot Update Details:');
      console.log('- Screenshot field being updated');
      console.log('- New screenshot value:', updateData.screenshot);
      console.log('- Is full URL:', updateData.screenshot.startsWith('http'));
    }

    // Special logging for comment updates
    if (updateData.comment !== undefined) {
      console.log('💬 Comment Update Details:');
      console.log('- Comment field being updated');
      console.log('- Comment length:', updateData.comment ? updateData.comment.length : 0);
      console.log('- Comment preview:', updateData.comment ? updateData.comment.substring(0, 100) + '...' : 'null/empty');
    }

    console.log('🔄 Executing findByIdAndUpdate...');
    const updateStartTime = Date.now();

    // Find and update the entry
    const updatedEntry = await EmpEnteredData.findByIdAndUpdate(
      id,
      updateData,
      updateOptions
    );

    const updateEndTime = Date.now();
    const updateDuration = updateEndTime - updateStartTime;

    console.log('Database Update Results:');
    console.log('- Update Duration:', updateDuration + 'ms');
    console.log('- Entry Found:', updatedEntry ? 'Yes' : 'No');

    if (!updatedEntry) {
      console.log('❌ ERROR: Entry not found in database');
      console.log('Searched ID:', id);
      console.log('No document found with this ID');
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    console.log('✅ Entry updated successfully');
    console.log('Updated Entry Details:');
    console.log('- ID:', updatedEntry._id);
    console.log('- Updated Fields:', Object.keys(updateData));
    
    // Special logging for screenshot updates
    if (updateData.screenshot !== undefined) {
      console.log('📸 Screenshot Update Successful:');
      console.log('- New screenshot in DB:', updatedEntry.screenshot);
      if (req.file) {
        console.log('- File saved as:', req.file.filename);
        console.log('- Full file path:', req.file.path);
        console.log('- Full URL:', updatedEntry.screenshot);
      }
    }
    
    // Special logging for comment updates
    if (updateData.comment !== undefined) {
      console.log('💬 Comment Update Successful:');
      console.log('- New comment in DB:', updatedEntry.comment);
      console.log('- Comment length:', updatedEntry.comment ? updatedEntry.comment.length : 0);
    }
    
    console.log('- Full Updated Entry:', JSON.stringify(updatedEntry, null, 2));

    const response = {
      success: true,
      message: 'Entry updated successfully',
      data: updatedEntry
    };

    console.log('=== SENDING SUCCESS RESPONSE ===');
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('Status Code: 200');

    res.status(200).json(response);

  } catch (error) {
    console.log('=== ERROR OCCURRED ===');
    console.error('Error Details:');
    console.error('- Error Name:', error.name);
    console.error('- Error Message:', error.message);
    console.error('- Error Stack:', error.stack);
    
    if (error.errors) {
      console.error('- Validation Errors:', JSON.stringify(error.errors, null, 2));
    }
    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large'
      });
    }
    
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      });
    }
    // Handle validation errors
    if (error.name === 'ValidationError') {
      console.log('❌ Handling ValidationError');
      const validationErrors = Object.values(error.errors).map(err => {
        console.log('Validation Error Detail:', {
          field: err.path,
          message: err.message,
          value: err.value,
          kind: err.kind
        });
        return err.message;
      });
      
      const validationResponse = {
        success: false,
        message: 'Validation error',
        errors: validationErrors
      };
      
      console.log('Sending validation error response:', JSON.stringify(validationResponse, null, 2));
      console.log('Status Code: 400');
      
      return res.status(400).json(validationResponse);
    }

    // Handle cast errors
    if (error.name === 'CastError') {
      console.log('❌ Handling CastError');
      console.log('Cast Error Details:', {
        path: error.path,
        value: error.value,
        kind: error.kind,
        reason: error.reason
      });
      
      const castErrorResponse = {
        success: false,
        message: 'Invalid data format'
      };
      
      console.log('Sending cast error response:', JSON.stringify(castErrorResponse, null, 2));
      console.log('Status Code: 400');
      
      return res.status(400).json(castErrorResponse);
    }

    // Handle general server errors
    console.log('❌ Handling Internal Server Error');
    const serverErrorResponse = {
      success: false,
      message: 'Internal server error'
    };
    
    console.log('Sending server error response:', JSON.stringify(serverErrorResponse, null, 2));
    console.log('Status Code: 500');
    
    res.status(500).json(serverErrorResponse);
  } finally {
    console.log('=== UPDATE ENTRY FUNCTION COMPLETED ===');
    console.log('End Timestamp:', new Date().toISOString());
    console.log('==========================================\n');
  }
};

///complete entry status by id
const completeEntry = async (req, res) => {
  try {
    // Get id from URL parameters
    const { id } = req.params;

    // Check if id exists
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Entry ID is required'
      });
    }

    // Validate ObjectId
    console.log('Received ID for completion:', id, 'Length:', id.length);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid ObjectId format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid entry ID format'
      });
    }

    // Check if entry exists first
    const existingEntry = await EmpEnteredData.findById(id);
    
    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Check if already completed
    if (existingEntry.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'Entry is already completed',
        data: existingEntry
      });
    }

    // Update only the status to completed
    const updatedEntry = await EmpEnteredData.findByIdAndUpdate(
      id,
      { 
        status: 'completed',
        updatedAt: new Date() // Optional: explicitly set updated timestamp
      },
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
        context: 'query' // Required for custom validators
      }
    );

    res.status(200).json({
      success: true,
      message: 'Entry status updated to completed successfully',
      data: updatedEntry
    });

  } catch (error) {
    console.error('Error completing entry:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    // Handle cast errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while completing entry'
    });
  }
};


const deleteEntry = async (req, res) => {
  try {
    // Get id from URL parameters
    const { id } = req.params;

    // Check if id exists
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Entry ID is required'
      });
    }

    // Validate ObjectId
    console.log('Received ID for deletion:', id, 'Length:', id.length);
        
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid ObjectId format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid entry ID format'
      });
    }

    // Check if entry exists first
    const existingEntry = await EmpEnteredData.findById(id);
        
    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Optional: Check if user has permission to delete this entry
    // Uncomment and modify based on your authentication/authorization logic
    /*
    if (req.user && req.user.role !== 'admin' && existingEntry.employeeId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this entry'
      });
    }
    */

    // Delete the entry
    await EmpEnteredData.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Entry deleted successfully',
      deletedEntry: {
        id: existingEntry._id,
        employeeId: existingEntry.employeeId,
        status: existingEntry.status,
        createdAt: existingEntry.createdAt
      }
    });

  } catch (error) {
    console.error('Error deleting entry:', error);

    // Handle cast errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting entry'
    });
  }
};


const getEmpEnteredDataByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params; // Get employeeId from URL parameters
    // Alternative: const { employeeId } = req.query; // If you prefer query parameters

    // Validate if employeeId is provided
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    // Get today's date range in Delhi timezone (Asia/Kolkata - same as Delhi)
    const delhiTimezone = 'Asia/Kolkata';
    const startOfDay = moment.tz(delhiTimezone).startOf('day').toDate();
    const endOfDay = moment.tz(delhiTimezone).endOf('day').toDate();
    
    // Log timezone info for debugging
    console.log('Delhi Time - Start of Day:', moment(startOfDay).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'));
    console.log('Delhi Time - End of Day:', moment(endOfDay).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'));

    const data = await EmpEnteredData.find({
      employeeId: employeeId,
      status: 'pending', // Filter by pending status
      createdAt: {
        $gte: startOfDay, // Greater than or equal to start of today
        $lt: endOfDay     // Less than start of tomorrow
      }
    })
      .populate('offerId', 'offerName description') // Adjust fields as per your Offer schema
      .populate('employeeId', 'fullName email') // Adjust fields as per your User schema
      .populate({
        path: 'paymentOption',
        model: 'Payment',
        select: 'name paymentType phoneNumber cardDetails upiDetails netbankingDetails walletDetails createdAt updatedAt',
        // This will return null if paymentOption is null or not found
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 }); // Sort by newest first

    // Debug: Log sample data dates and payment info
    if (data.length > 0) {
      console.log('Sample record dates and payment info:');
      data.slice(0, 2).forEach((item, index) => {
        console.log(`Record ${index + 1}:`, {
          _id: item._id,
          createdAt: item.createdAt,
          createdAtIST: moment(item.createdAt).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'),
          paymentOption: item.paymentOption ? {
            id: item.paymentOption._id,
            name: item.paymentOption.name,
            type: item.paymentOption.paymentType
          } : null
        });
      });
    }

    // Add Delhi timezone formatted dates to each record + format payment details - SHOW ALL DETAILS
    const dataWithFormattedDetails = data.map(item => {
      const itemObj = item.toObject();
      
      // Add timezone formatted dates
      itemObj.createdAtDelhi = {
        date: moment(item.createdAt).tz(delhiTimezone).format('DD-MM-YYYY'),
        time: moment(item.createdAt).tz(delhiTimezone).format('hh:mm:ss A'),
        fullDateTime: moment(item.createdAt).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'),
        isoString: moment(item.createdAt).tz(delhiTimezone).format()
      };
      
      if (item.updatedAt) {
        itemObj.updatedAtDelhi = {
          date: moment(item.updatedAt).tz(delhiTimezone).format('DD-MM-YYYY'),
          time: moment(item.updatedAt).tz(delhiTimezone).format('hh:mm:ss A'),
          fullDateTime: moment(item.updatedAt).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'),
          isoString: moment(item.updatedAt).tz(delhiTimezone).format()
        };
      }
      
      // Format payment details if available - SHOW ALL DETAILS WITHOUT MASKING
      if (item.paymentOption) {
        itemObj.paymentDetails = {
          id: item.paymentOption._id,
          name: item.paymentOption.name,
          paymentType: item.paymentOption.paymentType,
          phoneNumber: item.paymentOption.phoneNumber,
          
          // Include ALL card details if payment type is card
          ...(item.paymentOption.paymentType === 'card' && item.paymentOption.cardDetails && {
            cardDetails: {
              cardType: item.paymentOption.cardDetails.cardType,
              // Show COMPLETE card number - NO MASKING
              cardNumber: item.paymentOption.cardDetails.cardNumber,
              expirationDate: item.paymentOption.cardDetails.expirationDate,
              // Include CVV - COMPLETE DETAILS
              cvv: item.paymentOption.cardDetails.cvv,
              // Include any other card details
              cardHolderName: item.paymentOption.cardDetails.cardHolderName,
              billingAddress: item.paymentOption.cardDetails.billingAddress
            }
          }),
          
          // Include ALL UPI details if payment type is UPI
          ...(item.paymentOption.paymentType === 'upi' && item.paymentOption.upiDetails && {
            upiDetails: {
              upiId: item.paymentOption.upiDetails.upiId,
              bankName: item.paymentOption.upiDetails.bankName,
              // Show COMPLETE account number - NO MASKING
              accountNumber: item.paymentOption.upiDetails.accountNumber,
              ifscCode: item.paymentOption.upiDetails.ifscCode,
              // Include any other UPI details
              accountHolderName: item.paymentOption.upiDetails.accountHolderName,
              bankBranch: item.paymentOption.upiDetails.bankBranch,
              pin: item.paymentOption.upiDetails.pin,
              mpin: item.paymentOption.upiDetails.mpin
            }
          }),
          
          // Include ALL netbanking details if payment type is netbanking
          ...(item.paymentOption.paymentType === 'netbanking' && item.paymentOption.netbankingDetails && {
            netbankingDetails: {
              bankName: item.paymentOption.netbankingDetails.bankName,
              accountNumber: item.paymentOption.netbankingDetails.accountNumber,
              userId: item.paymentOption.netbankingDetails.userId,
              password: item.paymentOption.netbankingDetails.password,
              transactionPassword: item.paymentOption.netbankingDetails.transactionPassword,
              customerId: item.paymentOption.netbankingDetails.customerId
            }
          }),
          
          // Include ALL wallet details if payment type is wallet
          ...(item.paymentOption.paymentType === 'wallet' && item.paymentOption.walletDetails && {
            walletDetails: {
              walletName: item.paymentOption.walletDetails.walletName,
              walletNumber: item.paymentOption.walletDetails.walletNumber,
              pin: item.paymentOption.walletDetails.pin,
              balance: item.paymentOption.walletDetails.balance
            }
          }),
          
          // Include ALL available payment option fields
          additionalDetails: {
            // Any extra fields that might exist
            ...Object.keys(item.paymentOption.toObject()).reduce((acc, key) => {
              if (!['_id', 'name', 'paymentType', 'phoneNumber', 'cardDetails', 'upiDetails', 'netbankingDetails', 'walletDetails', 'createdAt', 'updatedAt'].includes(key)) {
                acc[key] = item.paymentOption[key];
              }
              return acc;
            }, {})
          },
          
          createdAt: item.paymentOption.createdAt,
          createdAtDelhi: moment(item.paymentOption.createdAt).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'),
          updatedAt: item.paymentOption.updatedAt,
          updatedAtDelhi: item.paymentOption.updatedAt ? moment(item.paymentOption.updatedAt).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A') : null
        };
        
        // Remove the original paymentOption to avoid duplication
        delete itemObj.paymentOption;
      } else {
        // If no payment option, set paymentDetails to null
        itemObj.paymentDetails = null;
        delete itemObj.paymentOption;
      }
      
      return itemObj;
    });

    // Count records with and without payment details
    const withPaymentDetails = dataWithFormattedDetails.filter(item => item.paymentDetails !== null).length;
    const withoutPaymentDetails = dataWithFormattedDetails.length - withPaymentDetails;

    // Enhanced statistics for different payment types
    const paymentTypeStats = {};
    dataWithFormattedDetails.forEach(item => {
      if (item.paymentDetails && item.paymentDetails.paymentType) {
        const type = item.paymentDetails.paymentType;
        paymentTypeStats[type] = (paymentTypeStats[type] || 0) + 1;
      }
    });

    // Calculate date range for response
    const dateRange = {
      from: moment(startOfDay).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'),
      to: moment(endOfDay).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'),
      timezone: delhiTimezone
    };

    res.status(200).json({
      success: true,
      message: `Today's pending entries for employee ID ${employeeId} retrieved successfully with COMPLETE payment details`,
      count: dataWithFormattedDetails.length,
      employeeId: employeeId,
      dateRange,
      paymentDetailsStats: {
        withPaymentDetails,
        withoutPaymentDetails,
        paymentTypeBreakdown: paymentTypeStats
      },
      dataVisibility: 'ALL_PAYMENT_DETAILS_VISIBLE_NO_MASKING',
      securityNote: 'WARNING: All sensitive payment information is visible including card numbers, CVV, account numbers, PINs, etc.',
      data: dataWithFormattedDetails
    });

  } catch (error) {
    console.error('Error fetching employee entered data by employee ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


// Import moment-timezone at the top of your file
// const moment = require('moment-timezone');

const getAllEmpPendingEntries = async (req, res) => {
  try {
    const { employeeId } = req.params; // Get employeeId from URL parameters
    // Alternative: const { employeeId } = req.query; // If you prefer query parameters

    // Validate if employeeId is provided
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    // Get Delhi timezone for consistent formatting
    const delhiTimezone = 'Asia/Kolkata';

    const data = await EmpEnteredData.find({
      employeeId: employeeId,
      status: 'pending' // Filter by pending status only
    })
      .populate('offerId', 'offerName description') // Adjust fields as per your Offer schema
      .populate('employeeId', 'fullName email') // Adjust fields as per your User schema
      .populate({
        path: 'paymentOption',
        model: 'Payment',
        select: 'name paymentType phoneNumber cardDetails upiDetails netbankingDetails walletDetails createdAt updatedAt',
        // This will return null if paymentOption is null or not found
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 }); // Sort by newest first

    // Debug: Log sample data dates and payment info
    if (data.length > 0) {
      console.log('Sample pending records with payment info:');
      data.slice(0, 2).forEach((item, index) => {
        console.log(`Record ${index + 1}:`, {
          _id: item._id,
          createdAt: item.createdAt,
          createdAtIST: moment(item.createdAt).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'),
          paymentOption: item.paymentOption ? {
            id: item.paymentOption._id,
            name: item.paymentOption.name,
            type: item.paymentOption.paymentType
          } : null
        });
      });
    }

    // Add Delhi timezone formatted dates to each record + format payment details - SHOW ALL DETAILS
    const dataWithFormattedDetails = data.map(item => {
      const itemObj = item.toObject();
      
      // Add timezone formatted dates
      itemObj.createdAtDelhi = {
        date: moment(item.createdAt).tz(delhiTimezone).format('DD-MM-YYYY'),
        time: moment(item.createdAt).tz(delhiTimezone).format('hh:mm:ss A'),
        fullDateTime: moment(item.createdAt).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'),
        isoString: moment(item.createdAt).tz(delhiTimezone).format()
      };
      
      if (item.updatedAt) {
        itemObj.updatedAtDelhi = {
          date: moment(item.updatedAt).tz(delhiTimezone).format('DD-MM-YYYY'),
          time: moment(item.updatedAt).tz(delhiTimezone).format('hh:mm:ss A'),
          fullDateTime: moment(item.updatedAt).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'),
          isoString: moment(item.updatedAt).tz(delhiTimezone).format()
        };
      }
      
      // Format payment details if available - SHOW ALL DETAILS WITHOUT MASKING
      if (item.paymentOption) {
        itemObj.paymentDetails = {
          id: item.paymentOption._id,
          name: item.paymentOption.name,
          paymentType: item.paymentOption.paymentType,
          phoneNumber: item.paymentOption.phoneNumber,
          
          // Include ALL card details if payment type is card
          ...(item.paymentOption.paymentType === 'card' && item.paymentOption.cardDetails && {
            cardDetails: {
              cardType: item.paymentOption.cardDetails.cardType,
              // Show COMPLETE card number - NO MASKING
              cardNumber: item.paymentOption.cardDetails.cardNumber,
              expirationDate: item.paymentOption.cardDetails.expirationDate,
              // Include CVV - COMPLETE DETAILS
              cvv: item.paymentOption.cardDetails.cvv,
              // Include any other card details
              cardHolderName: item.paymentOption.cardDetails.cardHolderName,
              billingAddress: item.paymentOption.cardDetails.billingAddress
            }
          }),
          
          // Include ALL UPI details if payment type is UPI
          ...(item.paymentOption.paymentType === 'upi' && item.paymentOption.upiDetails && {
            upiDetails: {
              upiId: item.paymentOption.upiDetails.upiId,
              bankName: item.paymentOption.upiDetails.bankName,
              // Show COMPLETE account number - NO MASKING
              accountNumber: item.paymentOption.upiDetails.accountNumber,
              ifscCode: item.paymentOption.upiDetails.ifscCode,
              // Include any other UPI details
              accountHolderName: item.paymentOption.upiDetails.accountHolderName,
              bankBranch: item.paymentOption.upiDetails.bankBranch,
              pin: item.paymentOption.upiDetails.pin,
              mpin: item.paymentOption.upiDetails.mpin
            }
          }),
          
          // Include ALL netbanking details if payment type is netbanking
          ...(item.paymentOption.paymentType === 'netbanking' && item.paymentOption.netbankingDetails && {
            netbankingDetails: {
              bankName: item.paymentOption.netbankingDetails.bankName,
              accountNumber: item.paymentOption.netbankingDetails.accountNumber,
              userId: item.paymentOption.netbankingDetails.userId,
              password: item.paymentOption.netbankingDetails.password,
              transactionPassword: item.paymentOption.netbankingDetails.transactionPassword,
              customerId: item.paymentOption.netbankingDetails.customerId
            }
          }),
          
          // Include ALL wallet details if payment type is wallet
          ...(item.paymentOption.paymentType === 'wallet' && item.paymentOption.walletDetails && {
            walletDetails: {
              walletName: item.paymentOption.walletDetails.walletName,
              walletNumber: item.paymentOption.walletDetails.walletNumber,
              pin: item.paymentOption.walletDetails.pin,
              balance: item.paymentOption.walletDetails.balance
            }
          }),
          
          // Include ALL available payment option fields
          additionalDetails: {
            // Any extra fields that might exist
            ...Object.keys(item.paymentOption.toObject()).reduce((acc, key) => {
              if (!['_id', 'name', 'paymentType', 'phoneNumber', 'cardDetails', 'upiDetails', 'netbankingDetails', 'walletDetails', 'createdAt', 'updatedAt'].includes(key)) {
                acc[key] = item.paymentOption[key];
              }
              return acc;
            }, {})
          },
          
          createdAt: item.paymentOption.createdAt,
          createdAtDelhi: moment(item.paymentOption.createdAt).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A'),
          updatedAt: item.paymentOption.updatedAt,
          updatedAtDelhi: item.paymentOption.updatedAt ? moment(item.paymentOption.updatedAt).tz(delhiTimezone).format('DD-MM-YYYY hh:mm:ss A') : null
        };
        
        // Remove the original paymentOption to avoid duplication
        delete itemObj.paymentOption;
      } else {
        // If no payment option, set paymentDetails to null
        itemObj.paymentDetails = null;
        delete itemObj.paymentOption;
      }
      
      return itemObj;
    });

    // Count records with and without payment details
    const withPaymentDetails = dataWithFormattedDetails.filter(item => item.paymentDetails !== null).length;
    const withoutPaymentDetails = dataWithFormattedDetails.length - withPaymentDetails;

    // Enhanced statistics for different payment types
    const paymentTypeStats = {};
    dataWithFormattedDetails.forEach(item => {
      if (item.paymentDetails && item.paymentDetails.paymentType) {
        const type = item.paymentDetails.paymentType;
        paymentTypeStats[type] = (paymentTypeStats[type] || 0) + 1;
      }
    });

    res.status(200).json({
      success: true,
      message: `All pending entries for employee ID ${employeeId} retrieved successfully with COMPLETE payment details`,
      count: dataWithFormattedDetails.length,
      employeeId: employeeId,
      paymentDetailsStats: {
        withPaymentDetails,
        withoutPaymentDetails,
        paymentTypeBreakdown: paymentTypeStats
      },
      dataVisibility: 'ALL_PAYMENT_DETAILS_VISIBLE_NO_MASKING',
      securityNote: 'WARNING: All sensitive payment information is visible including card numbers, CVV, account numbers, PINs, etc.',
      data: dataWithFormattedDetails
    });

  } catch (error) {
    console.error('Error fetching all pending employee entries:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


const bulkCompleteEntries = async (req, res) => {
  console.log('=== BULK COMPLETE ENTRIES FUNCTION STARTED ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Get entry IDs from request body
    const { entryIds } = req.body;
    
    console.log('Request Details:');
    console.log('- Method:', req.method);
    console.log('- URL:', req.originalUrl);
    console.log('- Body:', JSON.stringify(req.body, null, 2));
    console.log('- Entry IDs received:', entryIds);

    // Validate entryIds array
    if (!entryIds) {
      console.log('❌ ERROR: Entry IDs array is missing');
      return res.status(400).json({
        success: false,
        message: 'Entry IDs array is required'
      });
    }

    if (!Array.isArray(entryIds)) {
      console.log('❌ ERROR: Entry IDs must be an array');
      console.log('Received type:', typeof entryIds);
      return res.status(400).json({
        success: false,
        message: 'Entry IDs must be provided as an array'
      });
    }

    if (entryIds.length === 0) {
      console.log('❌ ERROR: Entry IDs array is empty');
      return res.status(400).json({
        success: false,
        message: 'At least one entry ID is required'
      });
    }

    // Limit the number of entries that can be updated at once
    const MAX_BULK_UPDATE = 100; // Adjust as needed
    if (entryIds.length > MAX_BULK_UPDATE) {
      console.log('❌ ERROR: Too many entries for bulk update');
      console.log('Received count:', entryIds.length);
      console.log('Maximum allowed:', MAX_BULK_UPDATE);
      return res.status(400).json({
        success: false,
        message: `Cannot update more than ${MAX_BULK_UPDATE} entries at once`
      });
    }

    console.log('✅ Initial validation passed');
    console.log('- Entry IDs count:', entryIds.length);
    console.log('- Entry IDs array:', entryIds);

    // Validate each ObjectId
    const invalidIds = [];
    const validIds = [];

    entryIds.forEach((id, index) => {
      console.log(`Validating ID ${index + 1}:`, id, 'Type:', typeof id);
      
      if (!id || typeof id !== 'string') {
        invalidIds.push({ id, reason: 'ID must be a non-empty string' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('Invalid ObjectId format:', id);
        invalidIds.push({ id, reason: 'Invalid ObjectId format' });
        return;
      }

      validIds.push(id);
      console.log('✅ Valid ID:', id);
    });

    if (invalidIds.length > 0) {
      console.log('❌ ERROR: Some IDs are invalid');
      console.log('Invalid IDs:', invalidIds);
      return res.status(400).json({
        success: false,
        message: 'Some entry IDs are invalid',
        invalidIds: invalidIds
      });
    }

    console.log('✅ All ObjectId validations passed');
    console.log('Valid IDs count:', validIds.length);

    // Remove duplicates
    const uniqueIds = [...new Set(validIds)];
    const duplicatesRemoved = validIds.length - uniqueIds.length;
    
    if (duplicatesRemoved > 0) {
      console.log(`🔄 Removed ${duplicatesRemoved} duplicate ID(s)`);
    }
    
    console.log('Final unique IDs:', uniqueIds);
    console.log('Final count:', uniqueIds.length);

    // Check which entries exist and their current status
    console.log('🔍 Checking existing entries...');
    const existingEntries = await EmpEnteredData.find({
      _id: { $in: uniqueIds }
    }).select('_id status');

    const existingIds = existingEntries.map(entry => entry._id.toString());
    const notFoundIds = uniqueIds.filter(id => !existingIds.includes(id));
    const alreadyCompletedIds = existingEntries
      .filter(entry => entry.status === 'completed')
      .map(entry => entry._id.toString());
    const toUpdateIds = existingEntries
      .filter(entry => entry.status !== 'completed')
      .map(entry => entry._id.toString());

    console.log('Entry Status Analysis:');
    console.log('- Total requested:', uniqueIds.length);
    console.log('- Found in database:', existingIds.length);
    console.log('- Not found:', notFoundIds.length);
    console.log('- Already completed:', alreadyCompletedIds.length);
    console.log('- To be updated:', toUpdateIds.length);
    console.log('- Not found IDs:', notFoundIds);
    console.log('- Already completed IDs:', alreadyCompletedIds);
    console.log('- To update IDs:', toUpdateIds);

    // Perform bulk update
    let bulkUpdateResult = null;
    let updatedEntries = [];

    if (toUpdateIds.length > 0) {
      console.log('🔄 Performing bulk update...');
      const updateStartTime = Date.now();

      bulkUpdateResult = await EmpEnteredData.updateMany(
        {
          _id: { $in: toUpdateIds }
        },
        {
          $set: {
            status: 'completed',
            updatedAt: new Date()
          }
        },
        {
          runValidators: true
        }
      );

      const updateEndTime = Date.now();
      const updateDuration = updateEndTime - updateStartTime;

      console.log('Bulk Update Results:');
      console.log('- Update Duration:', updateDuration + 'ms');
      console.log('- Matched Count:', bulkUpdateResult.matchedCount);
      console.log('- Modified Count:', bulkUpdateResult.modifiedCount);
      console.log('- Acknowledged:', bulkUpdateResult.acknowledged);

      // Get updated entries for response
      updatedEntries = await EmpEnteredData.find({
        _id: { $in: toUpdateIds }
      });

      console.log('✅ Bulk update completed successfully');
    } else {
      console.log('⏭️ No entries to update');
    }

    // Prepare comprehensive response
    const response = {
      success: true,
      message: 'Bulk entry completion processed',
      summary: {
        totalRequested: uniqueIds.length,
        found: existingIds.length,
        notFound: notFoundIds.length,
        alreadyCompleted: alreadyCompletedIds.length,
        updated: toUpdateIds.length,
        duplicatesRemoved: duplicatesRemoved
      },
      details: {
        updatedEntries: updatedEntries,
        notFoundIds: notFoundIds,
        alreadyCompletedIds: alreadyCompletedIds,
        ...(bulkUpdateResult && {
          bulkUpdateResult: {
            matchedCount: bulkUpdateResult.matchedCount,
            modifiedCount: bulkUpdateResult.modifiedCount,
            acknowledged: bulkUpdateResult.acknowledged
          }
        })
      }
    };

    console.log('=== SENDING SUCCESS RESPONSE ===');
    console.log('Response Summary:', JSON.stringify(response.summary, null, 2));
    console.log('Status Code: 200');

    res.status(200).json(response);

  } catch (error) {
    console.log('=== ERROR OCCURRED ===');
    console.error('Error Details:');
    console.error('- Error Name:', error.name);
    console.error('- Error Message:', error.message);
    console.error('- Error Stack:', error.stack);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      console.log('❌ Handling ValidationError');
      const validationErrors = Object.values(error.errors).map(err => {
        console.log('Validation Error Detail:', {
          field: err.path,
          message: err.message,
          value: err.value,
          kind: err.kind
        });
        return err.message;
      });

      const validationResponse = {
        success: false,
        message: 'Validation error during bulk update',
        errors: validationErrors
      };

      console.log('Sending validation error response:', JSON.stringify(validationResponse, null, 2));
      return res.status(400).json(validationResponse);
    }

    // Handle cast errors
    if (error.name === 'CastError') {
      console.log('❌ Handling CastError');
      return res.status(400).json({
        success: false,
        message: 'Invalid data format in bulk update'
      });
    }

    // Handle MongoDB bulk write errors
    if (error.name === 'BulkWriteError') {
      console.log('❌ Handling BulkWriteError');
      console.log('Bulk write error details:', error.writeErrors);
      return res.status(400).json({
        success: false,
        message: 'Bulk update operation failed',
        details: error.writeErrors
      });
    }

    // Handle general server errors
    console.log('❌ Handling Internal Server Error');
    const serverErrorResponse = {
      success: false,
      message: 'Internal server error during bulk completion'
    };

    console.log('Sending server error response:', JSON.stringify(serverErrorResponse, null, 2));
    res.status(500).json(serverErrorResponse);

  } finally {
    console.log('=== BULK COMPLETE ENTRIES FUNCTION COMPLETED ===');
    console.log('End Timestamp:', new Date().toISOString());
    console.log('=====================================================\n');
  }
};


const getEmployeeEntryStats = async (req, res) => {
  try {
    // Get date range from query parameters
    const { startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      
      if (endDate) {
        // Add 23:59:59 to end date to include the entire day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = endDateTime;
      }
    }

    // Get overall statistics first
    const overallStats = await EmpEnteredData.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          completedEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get offer-wise statistics with employee breakdown
    const offerStats = await EmpEnteredData.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: {
            offerId: '$offerId',
            employeeId: '$employeeId'
          },
          totalEntries: { $sum: 1 },
          completedEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.employeeId',
          foreignField: '_id',
          as: 'employeeInfo'
        }
      },
      {
        $addFields: {
          employeeName: { 
            $ifNull: [
              { $arrayElemAt: ['$employeeInfo.fullName', 0] },
              'Unknown Employee'
            ]
          },
          employeeEmail: { 
            $ifNull: [
              { $arrayElemAt: ['$employeeInfo.email', 0] },
              null
            ]
          }
        }
      },
      {
        $group: {
          _id: '$_id.offerId',
          totalEntries: { $sum: '$totalEntries' },
          completedEntries: { $sum: '$completedEntries' },
          pendingEntries: { $sum: '$pendingEntries' },
          employees: {
            $push: {
              employeeId: '$_id.employeeId',
              employeeName: '$employeeName',
              employeeEmail: '$employeeEmail',
              totalEntries: '$totalEntries',
              completedEntries: '$completedEntries',
              pendingEntries: '$pendingEntries'
            }
          }
        }
      },
      {
        $lookup: {
          from: 'offers',
          localField: '_id',
          foreignField: '_id',
          as: 'offerInfo'
        }
      },
      {
        $addFields: {
          offerId: '$_id',
          offerTitle: { 
            $ifNull: [
              { $arrayElemAt: ['$offerInfo.offerName', 0] },
              'Unknown Offer'
            ]
          },

        }
      },
      {
        $addFields: {
          employees: {
            $map: {
              input: { $sortArray: { input: '$employees', sortBy: { totalEntries: -1 } } },
              as: 'emp',
              in: '$$emp'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          offerId: 1,
          offerTitle: 1,
          offerDescription: 1,
          offerType: 1,
          totalEntries: 1,
          completedEntries: 1,
          pendingEntries: 1,
          employees: 1
        }
      },
      { $sort: { totalEntries: -1 } }
    ]);

    // Format overall stats
    const overall = overallStats[0] || {
      totalEntries: 0,
      completedEntries: 0,
      pendingEntries: 0
    };

    // Response structure - Only offer-wise with employee breakdown inside each offer
    const responseData = {
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
        filtered: !!(startDate || endDate)
      },
      overall: {
        totalEntries: overall.totalEntries,
        completedEntries: overall.completedEntries,
        pendingEntries: overall.pendingEntries
      },
      offers: offerStats.map(offer => ({
        offerId: offer.offerId,
        offerTitle: offer.offerTitle,
        offerDescription: offer.offerDescription,
        offerType: offer.offerType,
        offerTotals: {
          totalEntries: offer.totalEntries,
          completedEntries: offer.completedEntries,
          pendingEntries: offer.pendingEntries
        },
        employees: offer.employees.map(emp => ({
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          employeeEmail: emp.employeeEmail,
          assignedEntries: emp.totalEntries,
          completedEntries: emp.completedEntries,
          pendingEntries: emp.pendingEntries
        }))
      })),
      summary: {
        totalOffers: offerStats.length,
        totalUniqueEmployees: [...new Set(offerStats.flatMap(offer => 
          offer.employees.map(emp => emp.employeeId.toString())
        ))].length,
        totalEntries: overall.totalEntries
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Employee entry statistics retrieved successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Error getting employee entry stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



const getEmployeeSpecificStats = async (req, res) => {
  try {
    // Get employeeId from query parameters
    const { employeeId } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    // Convert employeeId to ObjectId if it's a valid ObjectId string
    let employeeObjectId;
    try {
      employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Employee ID format'
      });
    }

    // Get today's date range in Asia/Kolkata timezone
    const today = moment.tz('Asia/Kolkata');
    const startOfToday = today.clone().startOf('day').toDate();
    const endOfToday = today.clone().endOf('day').toDate();

    console.log('Debug Info:');
    console.log('Employee ID:', employeeId);
    console.log('Employee ObjectId:', employeeObjectId);
    console.log('Today date range:', {
      start: startOfToday,
      end: endOfToday
    });

    // First, let's check if there's any data for this employee (without date filter)
    const employeeDataCheck = await EmpEnteredData.find({ employeeId: employeeObjectId }).limit(5);
    console.log('Employee data check (any date):', employeeDataCheck.length, 'records found');

    // Check if there's any data for today (without employee filter)
    const todayDataCheck = await EmpEnteredData.find({ 
      createdAt: { $gte: startOfToday, $lte: endOfToday } 
    }).limit(5);
    console.log('Today data check (any employee):', todayDataCheck.length, 'records found');

    // Build filter for today's data and specific employee
    const dateFilter = {
      employeeId: employeeObjectId,
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    };

    // Check combined filter
    const combinedCheck = await EmpEnteredData.find(dateFilter).limit(5);
    console.log('Combined filter check:', combinedCheck.length, 'records found');

    // Get overall statistics for this employee today
    const overallStats = await EmpEnteredData.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          completedEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get employee info - Check if employee exists at all
    const employeeInfo = await EmpEnteredData.aggregate([
      {
        $match: { employeeId: employeeObjectId }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employeeInfo'
        }
      },
      {
        $addFields: {
          employeeName: { 
            $ifNull: [
              { $arrayElemAt: ['$employeeInfo.fullName', 0] },
              'Unknown Employee'
            ]
          },
          employeeEmail: { 
            $ifNull: [
              { $arrayElemAt: ['$employeeInfo.email', 0] },
              null
            ]
          }
        }
      },
      {
        $project: {
          employeeName: 1,
          employeeEmail: 1
        }
      },
      {
        $limit: 1
      }
    ]);

    // Alternative: Try to get employee info directly from users collection
    const directEmployeeInfo = await mongoose.connection.db.collection('users').findOne(
      { _id: employeeObjectId }
    );
    console.log('Direct employee info:', directEmployeeInfo);

    // Get offer-wise statistics for this employee today
    const offerStats = await EmpEnteredData.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: '$offerId',
          totalEntries: { $sum: 1 },
          completedEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'offers',
          localField: '_id',
          foreignField: '_id',
          as: 'offerInfo'
        }
      },
      {
        $addFields: {
          offerId: '$_id',
          offerTitle: { 
            $ifNull: [
              { $arrayElemAt: ['$offerInfo.offerName', 0] },
              'Unknown Offer'
            ]
          },
        }
      },
      {
        $project: {
          _id: 0,
          offerId: 1,
          offerTitle: 1,
          offerDescription: 1,
          offerType: 1,
          totalEntries: 1,
          completedEntries: 1,
          pendingEntries: 1
        }
      },
      { $sort: { totalEntries: -1 } }
    ]);

    // Format overall stats
    const overall = overallStats[0] || {
      totalEntries: 0,
      completedEntries: 0,
      pendingEntries: 0
    };

    // Get employee details with fallback
    const empDetails = employeeInfo[0] || directEmployeeInfo || {
      employeeName: 'Unknown Employee',
      employeeEmail: null
    };

    // Use the name field from direct query if available
    if (directEmployeeInfo && directEmployeeInfo.name) {
      empDetails.employeeName = directEmployeeInfo.name;
      empDetails.employeeEmail = directEmployeeInfo.email;
    }

    // Response structure - Employee-specific offer-wise breakdown
    const responseData = {
      debug: {
        employeeDataExists: employeeDataCheck.length > 0,
        todayDataExists: todayDataCheck.length > 0,
        combinedDataExists: combinedCheck.length > 0,
        directEmployeeFound: !!directEmployeeInfo
      },
      date: {
        today: today.format('YYYY-MM-DD'),
        timezone: 'Asia/Kolkata',
        dateRange: {
          start: moment(startOfToday).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
          end: moment(endOfToday).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
        }
      },
      employee: {
        employeeId: employeeId,
        employeeName: empDetails.employeeName,
        employeeEmail: empDetails.employeeEmail
      },
      overall: {
        totalEntries: overall.totalEntries,
        completedEntries: overall.completedEntries,
        pendingEntries: overall.pendingEntries
      },
      offers: offerStats.map(offer => ({
        offerId: offer.offerId,
        offerTitle: offer.offerTitle,
        offerDescription: offer.offerDescription,
        offerType: offer.offerType,
        assignedEntries: offer.totalEntries,
        completedEntries: offer.completedEntries,
        pendingEntries: offer.pendingEntries,
        completionRate: offer.totalEntries > 0 ? 
          Math.round((offer.completedEntries / offer.totalEntries) * 100) : 0
      })),
      summary: {
        totalOffers: offerStats.length,
        totalEntries: overall.totalEntries,
        completionRate: overall.totalEntries > 0 ? 
          Math.round((overall.completedEntries / overall.totalEntries) * 100) : 0
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Employee-specific entry statistics retrieved successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Error getting employee-specific entry stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


module.exports = {
  createOffer,
  getAllOffers,
  getOffersByClientId,
  getOfferById,
  updateClientOffer,
  deleteOffer,
  createDailyAndEmpAssignWork,
  getAllDailyAssignWork,
  getAllEmployeeWiseAssignWork,
  createMultipleEmpEntries,
  ///////
  previewTrackingDistribution, 
  confirmAndCreateEntries,
  getAllEmpEnteredData,
  getAllEmpEnteredDataWithFiter,
  ///controller to update multiple entry counts by id only
  updateMultipleEntryCounts,
  updateEntry,
  completeEntry,
  //employee entries
  getEmpEnteredDataByEmployeeId,
  getAllEmpPendingEntries,
  deleteEntry,
  bulkCompleteEntries,
  getEmployeeEntryStats,
  getEmployeeSpecificStats,
};