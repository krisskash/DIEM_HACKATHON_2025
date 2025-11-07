const mongoose = require('mongoose');

const lockerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  placeId: {
    type: String,
    unique: true,
    sparse: true
  },
  types: [String],
  rating: Number,
  userRatingsTotal: Number,
  code: {
    type: String,
    unique: true,
    sparse: true
  },
  capacity: {
    type: Number,
    default: 20
  },
  availableSlots: {
    type: Number,
    default: 20
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  operatingHours: {
    open: {
      type: String,
      default: '00:00'
    },
    close: {
      type: String,
      default: '23:59'
    }
  },
  features: [{
    type: String,
    enum: ['24/7', 'climate-controlled', 'secure', 'indoor', 'outdoor']
  }]
}, {
  timestamps: true
});

// Index for geospatial queries
lockerSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model('Locker', lockerSchema);
