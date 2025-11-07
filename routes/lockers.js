const express = require('express');
const router = express.Router();
const Locker = require('../models/Locker');

/**
 * GET /api/lockers
 * Get all active lockers
 */
router.get('/', async (req, res) => {
  try {
    const { status, lat, lng, radius } = req.query;
    
    let query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    } else {
      query.status = 'active'; // Default to active only
    }
    
    const lockers = await Locker.find(query).sort({ name: 1 });
    
    // Filter by radius if coordinates provided
    let filteredLockers = lockers;
    if (lat && lng && radius) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxRadius = parseFloat(radius); // in km
      
      filteredLockers = lockers.filter(locker => {
        const distance = calculateDistance(
          userLat,
          userLng,
          locker.lat,
          locker.lng
        );
        return distance <= maxRadius;
      });
    }
    
    res.json({ 
      success: true, 
      count: filteredLockers.length,
      lockers: filteredLockers 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/lockers/:id
 * Get specific locker
 */
router.get('/:id', async (req, res) => {
  try {
    const locker = await Locker.findById(req.params.id);
    
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Locker not found' });
    }
    
    res.json({ success: true, locker });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lockers
 * Create new locker (admin only for now)
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      code,
      address,
      coordinates,
      capacity,
      operatingHours,
      features
    } = req.body;
    
    // Validate required fields
    if (!name || !code || !address || !coordinates) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, code, address, and coordinates required' 
      });
    }
    
    // Check if code already exists
    const existing = await Locker.findOne({ code });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'Locker code already exists' 
      });
    }
    
    const locker = new Locker({
      name,
      code,
      address,
      coordinates,
      capacity: capacity || 20,
      availableSlots: capacity || 20,
      operatingHours,
      features
    });
    
    await locker.save();
    
    res.status(201).json({ 
      success: true, 
      locker,
      message: 'Locker created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/lockers/:id
 * Update locker
 */
router.put('/:id', async (req, res) => {
  try {
    const locker = await Locker.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Locker not found' });
    }
    
    res.json({ 
      success: true, 
      locker,
      message: 'Locker updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/lockers/:id
 * Delete locker
 */
router.delete('/:id', async (req, res) => {
  try {
    const locker = await Locker.findByIdAndDelete(req.params.id);
    
    if (!locker) {
      return res.status(404).json({ success: false, error: 'Locker not found' });
    }
    
    res.json({ 
      success: true,
      message: 'Locker deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lockers/bulk
 * Bulk create lockers from array
 * Body: { lockers: [{ name, address }, ...] }
 */
router.post('/bulk', async (req, res) => {
  try {
    const { lockers: lockerList } = req.body;
    
    if (!Array.isArray(lockerList) || lockerList.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide an array of lockers' 
      });
    }
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const item of lockerList) {
      if (!item.name || !item.address) {
        results.failed.push({ 
          item, 
          error: 'Name and address required' 
        });
        continue;
      }
      
      try {
        // Geocode address using Nominatim
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(item.address)}&limit=1`);
        const geoData = await geoResponse.json();
        
        if (!geoData || geoData.length === 0) {
          results.failed.push({ 
            item, 
            error: 'Address not found' 
          });
          continue;
        }
        
        const coordinates = {
          lat: parseFloat(geoData[0].lat),
          lng: parseFloat(geoData[0].lon)
        };
        
        // Generate code
        const prefix = item.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 3);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `${prefix}-${random}`;
        
        // Create locker
        const locker = new Locker({
          name: item.name,
          code,
          address: item.address,
          coordinates,
          capacity: item.capacity || 20,
          availableSlots: item.availableSlots || item.capacity || 20,
          features: item.features || ['secure'],
          status: 'active'
        });
        
        await locker.save();
        results.success.push(locker);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.failed.push({ 
          item, 
          error: error.message 
        });
      }
    }
    
    res.json({ 
      success: true,
      imported: results.success.length,
      failed: results.failed.length,
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lockers/seed
 * Seed sample locker data (for development)
 */
router.post('/seed', async (req, res) => {
  try {
    // Clear existing lockers
    await Locker.deleteMany({});
    
    // Athens Demo Locker Locations (Preset for Hackathon)
    const sampleLockers = [
      {
        name: 'Syntagma Square Locker',
        code: 'SYN-001',
        address: 'Syntagma Square, Athens 105 63, Greece',
        coordinates: { lat: 37.9755, lng: 23.7348 },
        capacity: 30,
        availableSlots: 28,
        features: ['24/7', 'secure', 'indoor', 'climate-controlled']
      },
      {
        name: 'Monastiraki Hub',
        code: 'MON-042',
        address: 'Monastiraki Square, Athens 105 55, Greece',
        coordinates: { lat: 37.9769, lng: 23.7258 },
        capacity: 25,
        availableSlots: 20,
        features: ['24/7', 'secure', 'indoor']
      },
      {
        name: 'Acropolis Metro Locker',
        code: 'ACR-123',
        address: 'Acropolis Metro Station, Athens 117 42, Greece',
        coordinates: { lat: 37.9688, lng: 23.7279 },
        capacity: 20,
        availableSlots: 18,
        features: ['secure', 'indoor', 'climate-controlled']
      },
      {
        name: 'Piraeus Port Locker',
        code: 'PIR-789',
        address: 'Piraeus Port, Piraeus 185 38, Greece',
        coordinates: { lat: 37.9407, lng: 23.6470 },
        capacity: 40,
        availableSlots: 35,
        features: ['24/7', 'secure', 'indoor']
      },
      {
        name: 'Kolonaki Center',
        code: 'KOL-456',
        address: 'Kolonaki Square, Athens 106 73, Greece',
        coordinates: { lat: 37.9790, lng: 23.7420 },
        capacity: 15,
        availableSlots: 12,
        features: ['secure', 'indoor']
      },
      {
        name: 'Omonia Station Locker',
        code: 'OMO-234',
        address: 'Omonia Square, Athens 104 31, Greece',
        coordinates: { lat: 37.9842, lng: 23.7277 },
        capacity: 25,
        availableSlots: 22,
        features: ['24/7', 'secure', 'indoor']
      },
      {
        name: 'Glyfada Beach Locker',
        code: 'GLY-567',
        address: 'Glyfada Beach, Athens 166 74, Greece',
        coordinates: { lat: 37.8661, lng: 23.7547 },
        capacity: 20,
        availableSlots: 15,
        features: ['secure', 'outdoor', '24/7']
      },
      {
        name: 'Athens Airport Locker',
        code: 'ATH-999',
        address: 'Athens International Airport, Spata 190 04, Greece',
        coordinates: { lat: 37.9364, lng: 23.9445 },
        capacity: 50,
        availableSlots: 45,
        features: ['24/7', 'secure', 'indoor', 'climate-controlled']
      }
    ];
    
    const lockers = await Locker.insertMany(sampleLockers);
    
    res.json({ 
      success: true, 
      count: lockers.length,
      lockers,
      message: 'Sample lockers created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = router;
