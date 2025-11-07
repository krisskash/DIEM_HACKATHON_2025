/**
 * Calculate delivery price based on package size and distance
 * @param {string} packageSize - 'small', 'medium', 'large'
 * @param {number} distanceKm - Distance in kilometers
 * @returns {object} Price breakdown
 */
function calculateDeliveryPrice(packageSize, distanceKm) {
  // Base starting fee: 1 euro
  const baseFee = 1.00;
  
  // Price per km: 1 euro
  const pricePerKm = 1.00;
  
  // Size multipliers
  const sizeMultipliers = {
    small: 1.0,    // Letter size, 1x pricing
    medium: 1.5,   // Shoebox size up to 2.5kg, 1.5x pricing
    large: 2.0     // 5kg+, 2x pricing
  };
  
  // Get multiplier
  const multiplier = sizeMultipliers[packageSize] || sizeMultipliers.small;
  
  // Calculate base cost (starting fee + distance * per km)
  const baseCost = baseFee + (distanceKm * pricePerKm);
  
  // Apply size multiplier
  const subtotal = baseCost * multiplier;
  
  // Platform fee (10%)
  const platformFee = subtotal * 0.10;
  
  // Total price
  const total = subtotal + platformFee;
  
  // Gig worker payout (total - platform fee)
  const gigWorkerPayout = total - platformFee;
  
  return {
    baseFee: parseFloat(baseFee.toFixed(2)),
    distancePrice: parseFloat((distanceKm * pricePerKm).toFixed(2)),
    baseCost: parseFloat(baseCost.toFixed(2)),
    sizeMultiplier: multiplier,
    subtotal: parseFloat(subtotal.toFixed(2)),
    platformFee: parseFloat(platformFee.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    gigWorkerPayout: parseFloat(gigWorkerPayout.toFixed(2)),
    breakdown: {
      packageSize,
      distanceKm: parseFloat(distanceKm.toFixed(2))
    }
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Get price estimate with coordinates
 * @param {string} packageSize - Package size
 * @param {object} lockerCoords - {lat, lng}
 * @param {object} deliveryCoords - {lat, lng}
 * @returns {object} Price breakdown
 */
function getPriceEstimate(packageSize, lockerCoords, deliveryCoords) {
  const distance = calculateDistance(
    lockerCoords.lat,
    lockerCoords.lng,
    deliveryCoords.lat,
    deliveryCoords.lng
  );
  
  return calculateDeliveryPrice(packageSize, distance);
}

module.exports = {
  calculateDeliveryPrice,
  calculateDistance,
  getPriceEstimate
};
