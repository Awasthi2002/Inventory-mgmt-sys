const express = require('express');
const router = express.Router();
const {
    GetBrandsByClientId,
    FetchOrdersByClientId,
    fetchDeliveredProductByClientId,
        changePassword,
        UpdateUser,
        getUserDetailsById
}= require('../../controllers/ClientPages/ClientController');

// Route: GET /brands/client/:clientId
router.get('/inventory/:clientId', GetBrandsByClientId);

router.get('/orders/:clientId', FetchOrdersByClientId);

// Route: GET /deliveries/client/:clientId
router.get('/deliveries/:clientId', fetchDeliveredProductByClientId);

router.post('/change-password', changePassword);

router.put('/update-user',UpdateUser);

router.get('/users/:id',getUserDetailsById);


module.exports = router;