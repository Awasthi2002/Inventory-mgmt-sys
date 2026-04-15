const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config/config');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');



const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
};




const register = async (req, res) => {
  const { email, role, poc = "admin", fullName, password, companyName, companyType, phone, address, gst_no, pan_no, status } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
      return res.status(400).send('User already exists with this email');
  }

// Generate a password if it is not provided
const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
const firstName = capitalizeFirstLetter(fullName.split(' ')[0]);
const newPassword = `${firstName}@123`; // Adds "123" after the first name
const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  const user = new User({ 
      email, 
      role, 
      poc, 
      password: hashedPassword, 
      fullName, 
      companyType, 
      companyName, 
      phone, 
      gst_no, 
      pan_no, 
      address, 
      status 
  });
  
  await user.save();

  res.status(201).send({ message: 'User registered successfully', generatedPassword: newPassword });
};

const login = async (req, res) => {
    const { email, password } = req.body;
    const lowercaseEmail = email.toLowerCase(); // Convert email to lowercase

    const user = await User.findOne({ email:lowercaseEmail });
    if (!user) {
        return res.status(401).send('User does not exist');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).send('Invalid password');
    }

    if (user.status !== 1) {
        return res.status(400).send('Your profile is being reviewed');
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret);
    res.json({ user: { email: user.email, role: user.role, status: user.status, _id:user._id ,poc:user.poc, address:user.address,fullName:user.fullName}, token });
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
};

const forgotPassword = async(req,res)=>{
    const {email} = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(400).json({ message: 'User does not exist' });
        }
        const secret = jwtSecret + user.password;
        const token = jwt.sign({ email: user.email, id: user._id }, secret, { expiresIn: '15m' });
        const link = `http://localhost:5173/auth/reset-password/${user._id}/${token}`;
    
        const transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
    
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'Password Reset Link',
          html: `<p>You requested for password reset</p><h5>Click on this <a href="${link}">link</a> to reset your password</h5>`,
        };
    
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ message: 'Error sending email' });
          }
          res.status(200).json({ message: 'Password reset link sent to your email account' });
        });
      } catch (error) {
        console.error('Error in forgot-password:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
};

const resetPassword=async(req,res)=>{
    const { id, token } = req.params;
    const { password } = req.body;
  
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(400).json({ message: 'User does not exist' });
    }
  
    const secret = jwtSecret + user.password;
    try {
      const payload = jwt.verify(token, secret);
      if (!validatePassword(password)) {
        return res.status(400).send('Password must be at least 8 characters long, contain one capital letter, one special character, and one number');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      await user.save();
      res.status(200).json({ message: 'Password successfully reset' });
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(400).send('Invalid token');
    }

};


const getResetPassword = async(req,res)=>{
    
    const { id, token } = req.params;

    // Verify if the user exists
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(400).json({ message: 'User does not exist' });
    }
  
    // Verify the token
    const secret = jwtSecret + user.password;
    try {
      jwt.verify(token, secret);
      // If verified, render the reset password form
      res.send(`
        <form action="/api/reset-password/${id}/${token}" method="POST">
          <input type="password" name="password" placeholder="Enter new password" required />
          <button type="submit">Reset Password</button>
        </form>
      `);
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(400).send('Invalid token');
    }
};


const GetUsersById = async(req,res)=>{
  try {
    const userId = req.params.id;

    // Fetch user details
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user details',
      error: error.message
    });
  }
};


// Controller to update user password by admin
const updateUserPassword = async (req, res) => {
    try {
        const { adminId, userId, newPassword } = req.body;

        // Validate required fields
        if (!adminId || !userId || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Admin ID, User ID, and new password are required'
            });
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(adminId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid admin ID or user ID format'
            });
        }

        // Verify admin authorization
        const admin = await User.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        if (admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Only admins can update passwords'
            });
        }

        // Check if target user exists
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&)'
            });
        }

        // Hash the new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user password
        await User.findByIdAndUpdate(userId, { 
            password: hashedPassword 
        });

        // Return success response (without sensitive data)
        res.status(200).json({
            success: true,
            message: 'Password updated successfully',
            data: {
                userId: targetUser._id,
                email: targetUser.email,
                fullName: targetUser.fullName,
                updatedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


module.exports = {  register, login, getUsers,forgotPassword ,resetPassword,getResetPassword,
  GetUsersById,updateUserPassword
};
