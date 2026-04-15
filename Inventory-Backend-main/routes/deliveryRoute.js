const express = require('express');
const router = express.Router();
const upload = require('../config/multer');

const {
    UpdateDeliveredProduct,
    FindAllOrderedProductByOrderId,
    GetAllEmployees,
    getUserById
   } = require('../controllers/deliveryController');
  
// router.put('/update-delivery/:id', upload.single('screenshot'),UpdateDeliveredProduct );
router.put('/update-delivery/:id', upload.single('reviewScreenshot'), UpdateDeliveredProduct);

router.get('/brand-orders/:orderId',FindAllOrderedProductByOrderId);

router.get('/get-all-employees',GetAllEmployees);

router.get('/get-userbyid/:id',GetAllEmployees);

module.exports = router;