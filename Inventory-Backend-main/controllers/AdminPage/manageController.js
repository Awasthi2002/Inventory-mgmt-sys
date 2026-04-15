const User = require('../../models/User');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { jwtSecret, emailUser, emailPass } = require('../../config/config');
require('dotenv').config();

const { authenticateToken } = require('../../middleware/authenticateToken');
const JWT_SECRET = process.env.JWT_SECRET; // Store this in an environment variable
const TOKEN_EXPIRY = '2h';


// Function to send email to client
const sendEmailToClient = async (clientEmail, clientName) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,// Replace with your email
                pass: emailPass,  // Replace with your email password or app-specific password
            },
        });

        const mailOptions = {
            from: emailUser,// Replace with your email
            to: clientEmail,
            subject: 'Hello from Our Service',
            text: `Hi ${clientName},\n\nThis is a test email sent from our service.\n\nBest regards,\nYour Company`,
        };

        await transporter.sendMail(mailOptions);
        // console.log(`Email sent to ${clientEmail}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

// Controller function to handle sending email to a client
const sendEmailToClientById = async (req, res) => {
    try {
        const client = await User.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });

        await sendEmailToClient(client.email, client.fullName);
        res.status(200).json({ message: 'Email sent to the client' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Other client management functions
const getAllClients = async (req, res) => {
    try {
        const clients = await User.find({ role: 'client' });
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllVendors = async (req, res) => {
    try {
        const vendors = await User.find({ role: 'vendor' });
        res.status(200).json(vendors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getClientById = async (req, res) => {
    try {
        const client = await User.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.status(200).json(client);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createClient = async (req, res) => {
    const client = new User({ ...req.body, role: 'client' });
    try {
        const newClient = await client.save();
        res.status(201).json(newClient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateClient = async (req, res) => {
    try {
        const updatedClient = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedClient) return res.status(404).json({ message: 'Client not found' });
        res.status(200).json(updatedClient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteClient = async (req, res) => {
    try {
        const deletedClient = await User.findByIdAndDelete(req.params.id);
        if (!deletedClient) return res.status(404).json({ message: 'Client not found' });
        res.status(200).json({ message: 'Client deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateClientStatus = async (req, res) => {
    try {
        const updatedClient = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        if (!updatedClient) return res.status(404).json({ message: 'Client not found' });
        res.status(200).json(updatedClient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};




const generateToken = (user, adminId = null) => {
    return jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        adminId: adminId
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
  };
  
  const loginAs = async (req, res) => {

    try {
        const { clientId } = req.body;
        const adminId = req.user.userId;
    
        const client = await User.findById(clientId);
        if (!client) {
          return res.status(404).json({ message: 'Client not found' });
        }
    
        const token = generateToken(client, adminId);
        res.json({ token, user: { ...client.toObject(), password: undefined } });
      } catch (error) {
        console.error('Login as client error:', error);
        res.status(500).json({ message: 'Error logging in as client' });
      }
  };
  
    const logoutAs = async (req, res) => {
        try {
            const adminId = req.user.adminId;
            if (adminId) {
              const admin = await User.findById(adminId);
              if (!admin) {
                return res.status(404).json({ message: 'Admin user not found' });
              }
              const token = generateToken(admin);
              res.json({ token, user: { ...admin.toObject(), password: undefined }, message: 'Returned to admin account' });
            } else {
              res.json({ message: 'Logged out successfully' });
            }
          } catch (error) {
            console.error('Logout as error:', error);
            res.status(500).json({ message: 'Error during logout process' });
          }
  };

  const RefreshToken = async(req,res)=>{
    const user = req.user;
    const newToken = generateToken(user, user.adminId);
    res.json({ token: newToken });
  }

module.exports = {
    getAllClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    updateClientStatus,
    sendEmailToClientById,
    getAllVendors,
    loginAs ,
    logoutAs,
    RefreshToken
};
