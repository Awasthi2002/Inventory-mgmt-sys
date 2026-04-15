const express = require('express');
const router = express.Router();
const upload = require('../config/multer');

const {
  getAllProductDeliveries,
  CreateConsumedProduct,
  getAllConsumedProducts,
  DeleteConsumedProduct,
  getConsumedProductById,
  updateConsumedProduct
  
 } = require('../controllers/consumptionController');


 router.get('/delivered-prouducts', getAllProductDeliveries);

 router.post('/create-consumed-product', CreateConsumedProduct);

 router.get('/get-all-consumed-product',getAllConsumedProducts);

 router.delete('/delete-consumed-product/:id',DeleteConsumedProduct);

 router.get('/get-all-consumed-productbyId/:id',getConsumedProductById);

 router.put('/update-consumption/:id',updateConsumedProduct);

module.exports = router;