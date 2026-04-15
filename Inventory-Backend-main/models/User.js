const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    companyName: String,
    phone: Number,
    address: String,
    companyType:String,
    poc:String,
    role: { type: String, required: true, enum: ['admin', 'User','client','operator',
      'Employee', ],default:'admin' }, // Adjust roles as necessary
    gst_no: {
        type: String,
        
      },
      pan_no: {
        type: String,
        
      },
    status: { type: Number, default: 0 }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

module.exports = User;
