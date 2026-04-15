const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { createBrand,
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
 } = require('../controllers/brandController');



router.post('/create', upload.any(), createBrand);

router.get('/get_all_inventory_list',GetAllInventoryList);

router.get('/get_inventory_list_by_employee/:id',GetInventoryByEmployeeId);

router.get('/inventory_list/:id', GetInventoryListbyId);

router.put('/update/:id', UpdateInventoryListById);

router.delete('/delete/:id', deleteBrandById);

// router.post('/stock_order',StockOrdered);
router.post('/stock_order', upload.single('screenshot'), StockOrdered);

router.get('/get_all_ordered_product',FetchAllOrderdProduct);

router.patch('/update-delivery-status', updateDeliveryStatus);

router.get('/product-order/:orderId',FetchOrderProduct);

router.post('/deliveries',upload.single('screenshot'),ProductDelivered);

router.get('/get-all-delivered-product',fetchDeliveredProduct);

router.put('/:orderId/complete-delivery',CompleteDelivery);

router.delete('/order/:orderId',  deleteProductOrder);

router.get('/orders/:orderId/details', getOrderDetailsWithDelivery);

router.post('/post_consumed_product',CreateConsumedProduct);

router.get('/consumed-products', GetConsumedProductDetails);

router.delete('/delete-dilevery-record/:id',DeleteProductDeliveryRecord);


router.get('/products-order/:id', GetProductOrderDetailsById);

router.put('/products-order-update/:id',upload.single('screenshot'),UpdateProductOrder);

router.get('/brand_details', GetBrandsAndProduct);

router.get('/by-order/:id',GetDeliveredProductById );

router.get('/get-emplyee-productOrders/:id',FetchOrdersByEmployeeId);

router.get('/get-stauts-product',getAllBrandsWithDetails);

router.get('/get-all-delivered-product-by-employee/:id',fetchDeliveredProductByEmployeeId);

module.exports = router;