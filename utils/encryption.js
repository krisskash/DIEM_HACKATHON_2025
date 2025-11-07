const crypto = require('crypto');

/**
 * Hash data using SHA256
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
function hashData(data) {
  if (!data) return null;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash multiple fields of an object
 * @param {object} obj - Object with fields to hash
 * @param {array} fields - Array of field names to hash
 * @returns {object} Object with hashed fields
 */
function hashFields(obj, fields) {
  const hashed = { ...obj };
  fields.forEach(field => {
    if (hashed[field]) {
      hashed[field] = hashData(hashed[field]);
    }
  });
  return hashed;
}

module.exports = {
  hashData,
  hashFields
};
