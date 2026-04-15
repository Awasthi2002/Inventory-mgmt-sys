const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { createPayment,
    getAllPayments,
    getPaymentById,
    updatePayment,
    deletePayment
 } = require('../controllers/AccountDetailsController');



router.post('/create-accountdetails',createPayment);

router.get('/get-allaccount-details',getAllPayments);

router.get('/get-account-detail/:id', getPaymentById);

router.put('/update-account-details/:id', updatePayment);

router.delete('/delete-account/:id', deletePayment);

module.exports = router;