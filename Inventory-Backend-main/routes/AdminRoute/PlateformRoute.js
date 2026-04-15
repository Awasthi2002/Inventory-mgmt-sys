const express = require('express');
const router = express.Router();
const {
    createPlatform,
    getAllPlatforms,updatePlatform, deletePlatform
}= require('../../controllers/AdminPage/PlatformController');

router.post('/create-platform', createPlatform);

router.get('/get-all-platforms', getAllPlatforms);

router.put('/update-platform/:id', updatePlatform);

router.delete('/delete-platform/:id', deletePlatform);


module.exports = router;