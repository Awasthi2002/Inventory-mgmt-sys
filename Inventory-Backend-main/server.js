require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const User = require('./models/User');


const config = require('./config/config');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');

// Add this import after your existing requires
const BackupService = require('./services/backupService');


const userRoutes = require('./routes/AdminRoute/userRoutes');

const EmployeesRoutes = require('./routes/AdminRoute/EmployeesRoutes');

const consumedProductsRoute = require('./routes/consumptionRoutes');

const brandRoutes = require('./routes/brandRoute');

const deliveryRoute = require('./routes/deliveryRoute');

const AccountDetailsRoute = require('./routes/AccountDetailsRoute');

const PlatformRoute = require('./routes/AdminRoute/PlateformRoute');

const ClientRoute = require('./routes/ClientRoute/clientRoute');

const OfferRoute = require('./routes/AdminRoute/OfferRoute');



const app = express();

// Middleware
app.use(express.json());
const corsOptions = {
    origin: 'http://localhost:5173',    
    credentials: true
  };
  
  app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.mongoURI,
    collectionName: 'sessions'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax'
  }
}));

// Function to create admin user
async function createAdminUser() {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash(config.adminPassword, 10);
      const adminUser = new User({
        fullName: config.adminName,
        email: config.adminEmail,
        password: hashedPassword,
        role: config.adminRole,
        companyName: config.adminCompany,
        companyType: null,
        status: 1,
        gst_no: null,
        pan_no: null,
        phone: config.adminPhone        
      });
      await adminUser.save();
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Database connection
mongoose.connect(config.mongoURI)
  .then(() => {
    console.log('Connected to MongoDB');
    createAdminUser();


        // Initialize backup service - No MongoDB tools required!
    const backupService = new BackupService();
    backupService.scheduleBackups();
    
    // Make backupService available globally for routes
    app.locals.backupService = backupService;
  })
  .catch(err => console.error('MongoDB connection error:', err));


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Routes
app.use('/api', userRoutes);

app.use('/api',EmployeesRoutes);
// Routes
app.use('/api/brands', brandRoutes);

//consumed product
app.use('/api/consumed-products', consumedProductsRoute);

//delivery product
app.use('/api/delivery-products', deliveryRoute);

app.use('/api/payment', AccountDetailsRoute);

app.use('/api/platform', PlatformRoute);

app.use('/api/client', ClientRoute);

app.use('/api/offer', OfferRoute);


// Manual backup trigger
app.post('/api/admin/backup', async (req, res) => {
  try {
    const backupPath = await req.app.locals.backupService.manualBackup();
    res.json({ 
      success: true, 
      message: 'Backup completed successfully',
      backupPath: path.basename(backupPath),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual backup failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Backup failed', 
      error: error.message 
    });
  }
});

// List all backups
app.get('/api/admin/backups', async (req, res) => {
  try {
    const stats = await req.app.locals.backupService.getBackupStats();
    res.json({ 
      success: true, 
      ...stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to list backups', 
      error: error.message 
    });
  }
});


// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: error.message
    });
  }
  next(error);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`)
});