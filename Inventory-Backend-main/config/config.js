require('dotenv').config();

module.exports = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoURI: process.env.MONGO_URI,
    sessionSecret: process.env.SESSION_SECRET,
    jwtSecret: process.env.JWT_SECRET,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
    adminRole: "admin",
    adminCompany: "Marcadeo",
    adminPhone: "1234567890",    
    adminName: process.env.ADMIN_NAME,
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
  };