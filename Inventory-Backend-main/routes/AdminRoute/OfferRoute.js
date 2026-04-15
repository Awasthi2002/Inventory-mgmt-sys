const express = require('express');
const router = express.Router();
const upload = require('../../config/multer');

const {  createOffer,
  getOfferById,
  updateClientOffer,
  getAllOffers,
  getOffersByClientId,
  createDailyAndEmpAssignWork,
  getAllDailyAssignWork,
  getAllEmployeeWiseAssignWork,
  createMultipleEmpEntries,
  /////
    previewTrackingDistribution, 
    confirmAndCreateEntries ,
    getAllEmpEnteredData,
    getAllEmpEnteredDataWithFiter,
    /// update assignment entry count
    updateMultipleEntryCounts,
  updateEntry,
  completeEntry,
  deleteEntry,
  //employee 
  getEmpEnteredDataByEmployeeId,
  getAllEmpPendingEntries,

  bulkCompleteEntries,
  getEmployeeEntryStats,
  getEmployeeSpecificStats

}= require('../../controllers/AdminPage/OfferController');


// Create a new offer
router.post('/create', createOffer);

// Get an offer by ID
router.get('/get-offer/:id', getOfferById);

//update offer
router.put('/update-offer/:id', updateClientOffer);

// Get all offers
router.get('/get-all-offers', getAllOffers);

//get offer by client id
 router.get('/get-offers/:clientId', getOffersByClientId);


router.post('/create-offer-entry', createDailyAndEmpAssignWork);


router.get('/daily-assign-work', getAllDailyAssignWork);

router.get('/empwise-daily-work', getAllEmployeeWiseAssignWork);

router.post('/assign-multiple-entries', createMultipleEmpEntries);

// Route for getting distribution preview
router.post('/preview-distribution', previewTrackingDistribution);

// Route for confirming and creating entries
router.post('/confirm-and-create-entries', confirmAndCreateEntries);

//route to get emp entered data
router.get('/get-all-emp-entered-data', getAllEmpEnteredData);

router.get('/emp-entries-with-filter', getAllEmpEnteredDataWithFiter);

// Route for updating multiple entry counts
router.post('/update-entry-counts', updateMultipleEntryCounts);

// Route for updating a employee assigned single entry
// router.put('/update-entry/:id', updateEntry);
router.put('/update-entry/:id', upload.single('screenshot'), updateEntry);
// Route for completing an entry
router.put('/complete-entry/:id', completeEntry);
// Route for deleting an entry
router.delete('/delete-entry/:id', deleteEntry);

// Route for getting employee entered data by employee ID
router.get('/get-emp-entered-data/:employeeId', getEmpEnteredDataByEmployeeId);
// Route for getting all employee pending entries
router.get('/get-all-emp-pending-entries/:employeeId', getAllEmpPendingEntries);

router.post('/entries/bulk-complete', bulkCompleteEntries);

/// admin employee analytic data 
router.get('/emp-data-analytics', getEmployeeEntryStats);
// Route for getting employee specific analytics
router.get('/emp-specific-analytics', getEmployeeSpecificStats);

module.exports = router;