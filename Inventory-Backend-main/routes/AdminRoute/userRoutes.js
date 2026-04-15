const express = require('express');
const router = express.Router();
const {  register, login, getUsers,forgotPassword,updateUserPassword,
  resetPassword,getResetPassword ,GetUsersById} = require('../../controllers/AdminPage/userController');
const {authenticateToken, isAdmin} = require('../../middleware/authenticateToken')
const { getAllClients, getClientById, createClient, updateClient, deleteClient ,
  updateClientStatus,sendEmailToClientById,
  getAllVendors , logoutAs, loginAs,RefreshToken} = require('../../controllers/AdminPage/manageController');


  
const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });
const path = require('path');
const fs = require('fs');
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/') // Make sure this directory exists
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '_' + Date.now() + path.extname(file.originalname))
    }
  }),
  fileFilter: function (req, file, cb) {
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed.'));
    }
  }
});




router.post('/register', register);
router.post('/login', login);

router.get('/users/:id',GetUsersById);


//forgot Password
router.post('/forgot-password',forgotPassword);
//resetPassword
router.post('/reset-password/:id/:token',resetPassword);

//client login route
router.post('/loginAs', authenticateToken, loginAs);
router.post('/logoutAs', authenticateToken, logoutAs);

router.post('/refreshToken',authenticateToken,RefreshToken);

router.get('/session', (req, res) => {
    if (req.session) {
        res.json(req.session);
    } else {
        res.status(401).json({ message: 'No active session' });
    }
});

router.get('/reset-password/:id/:token',getResetPassword);
//protected route
router.get('/users',authenticateToken, getUsers);


router.put('/admin/update-password', updateUserPassword);


module.exports = router;
