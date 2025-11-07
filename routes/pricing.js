const express = require('express');
const router = express.Router();
const { calculateDeliveryPrice, getPriceEstimate } = require('../utils/pricing');

/**
 * POST /api/pricing/calculate
 * Calculate delivery price
 */
router.post('/calculate', (req, res) => {
  try {
    const { packageSize, distanceKm } = req.body;
    
    if (!packageSize || !distanceKm) {
      return res.status(400).json({ 
        success: false, 
        error: 'Package size and distance required' 
      });
    }
    
    const pricing = calculateDeliveryPrice(packageSize, distanceKm);
    
    res.json({ 
      success: true, 
      pricing
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/pricing/estimate
 * Calculate price with coordinates
 */
router.post('/estimate', (req, res) => {
  try {
    const { packageSize, lockerCoords, deliveryCoords } = req.body;
    
    if (!packageSize || !lockerCoords || !deliveryCoords) {
      return res.status(400).json({ 
        success: false, 
        error: 'Package size and coordinates required' 
      });
    }
    
    const pricing = getPriceEstimate(packageSize, lockerCoords, deliveryCoords);
    
    res.json({ 
      success: true, 
      pricing
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/pricing/rates
 * Get base pricing rates
 */
router.get('/rates', (req, res) => {
  res.json({
    success: true,
    rates: {
      baseFee: '€1.00',
      pricePerKm: '€1.00',
      packageSizes: {
        small: { multiplier: 1.0, description: 'Letter size' },
        medium: { multiplier: 1.5, description: 'Shoebox size, up to 2.5kg' },
        large: { multiplier: 2.0, description: '5kg+' }
      },
      formula: 'Total = (€1 + distance×€1) × multiplier + 10% platform fee',
      examples: {
        '1km_small': '(€1 + €1) × 1.0 + 10% = €2.20',
        '1km_medium': '(€1 + €1) × 1.5 + 10% = €3.30',
        '5km_large': '(€1 + €5) × 2.0 + 10% = €13.20'
      },
      platformFee: '10% of subtotal'
    }
  });
});

module.exports = router;
