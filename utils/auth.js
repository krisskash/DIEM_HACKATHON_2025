const jwt = require('jsonwebtoken');
const ethers = require('ethers');

/**
 * Generate JWT token for authenticated user
 */
function generateToken(walletAddress) {
  return jwt.sign(
    { walletAddress: walletAddress.toLowerCase() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to authenticate requests
 */
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  
  req.user = decoded;
  next();
}

/**
 * Verify wallet signature (MetaMask sign message)
 */
function verifySignature(message, signature, expectedAddress) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    return false;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  verifySignature
};
