const express = require('express');
const router = express.Router();

/**
 * GET /api/config/maps-key
 * Get Google Maps API key for frontend
 */
router.get('/maps-key', (req, res) => {
  res.json({ 
    success: true, 
    apiKey: process.env.GOOGLE_MAPS_API_KEY 
  });
});

module.exports = router;
