const mongoose = require('mongoose');
const { hashData } = require('../utils/encryption');

const jobSchema = new mongoose.Schema({
  // Customer info
  customerId: {
    type: String,
    required: true
  },
  customerWallet: {
    type: String,
    required: true
  },
  
  // Locker info
  lockerLocation: {
    type: String,
    required: true
  },
  lockerCoords: {
    lat: Number,
    lng: Number
  },
  lockerCode: {
    type: String,
    required: true
  },
  
  // Package info
  packageSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  
  // Delivery info (will be hashed)
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryAddressPlain: {
    type: String,
    select: false  // Don't return in queries by default
  },
  deliveryCoords: {
    lat: Number,
    lng: Number
  },
  deliveryInstructions: String,
  
  // Distance
  distanceKm: Number,
  
  // Gig worker info
  gigWorkerId: String,
  gigWorkerWallet: String,
  gigWorkerName: String,
  
  // Payment
  amount: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    default: 0
  },
  paid: {
    type: Boolean,
    default: false
  },
  paidAt: Date,
  
  // Status tracking
  status: {
    type: String,
    enum: ['open', 'accepted', 'picked_up', 'delivered', 'disputed', 'cancelled'],
    default: 'open'
  },
  
  // Confirmation codes
  pickupConfirmationCode: String,
  deliveryConfirmationCode: String,
  
  // Rating
  gigWorkerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: Date,
  pickedUpAt: Date,
  deliveredAt: Date,
  
  // Smart contract reference
  contractTxHash: String,
  contractJobId: String,
  contractAddress: String,
  network: String,        // e.g., 'sepolia'
  chainId: Number,        // e.g., 11155111
  cryptocurrency: String, // 'diem' | 'eth' | 'usdc'
  tokenSymbol: String,    // 'DIEM' | 'ETH' | 'USDC'
  amountCrypto: Number    // amount paid in selected crypto
}, {
  timestamps: true
});

// Hash delivery address before saving (store plain for gig worker, hash for storage)
jobSchema.pre('save', function(next) {
  if (this.isModified('deliveryAddress') && !this.deliveryAddress.match(/^[a-f0-9]{64}$/)) {
    // Not already hashed, so store plain and hash
    this.deliveryAddressPlain = this.deliveryAddress;
    this.deliveryAddress = hashData(this.deliveryAddress);
  }
  next();
});

module.exports = mongoose.model('Job', jobSchema);
