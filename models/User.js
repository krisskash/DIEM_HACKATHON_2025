const mongoose = require('mongoose');
const { hashData } = require('../utils/encryption');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Wallet authentication (optional)
  walletAddress: {
    type: String,
    sparse: true,
    unique: true,
    lowercase: true
  },
  
  // Traditional authentication
  username: {
    type: String,
    sparse: true,
    unique: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    select: false // Don't return password by default
  },
  
  // Account type
  accountType: {
    type: String,
    enum: ['customer', 'gigWorker'],
    default: 'customer'
  },
  
  role: {
    type: String,
    enum: ['customer', 'gigworker', 'both'],
    default: 'customer'
  },
  
  // Profile
  firstName: String,
  lastName: String,
  phone: String,
  
  // Ratings and stats
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  totalJobs: {
    type: Number,
    default: 0
  },
  completedJobs: {
    type: Number,
    default: 0
  },
  
  // Gig worker specific
  isAvailable: {
    type: Boolean,
    default: true
  },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving (SHA256)
userSchema.pre('save', function(next) {
  if (this.isModified('password') && this.password) {
    this.password = crypto.createHash('sha256').update(this.password).digest('hex');
  }
  next();
});

// Method to verify password
userSchema.methods.verifyPassword = function(password) {
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  return this.password === hashedPassword;
};

module.exports = mongoose.model('User', userSchema);
