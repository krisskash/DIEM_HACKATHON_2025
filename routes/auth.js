const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, verifySignature } = require('../utils/auth');
const crypto = require('crypto');

/**
 * POST /api/auth/nonce
 * Get nonce for wallet to sign
 */
router.post('/nonce', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }
    
    const nonce = `Sign this message to authenticate with DIEM Delivery.\n\nNonce: ${Date.now()}`;
    
    res.json({ success: true, nonce });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Login with email/password or wallet
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, username, walletAddress, signature, message } = req.body;
    
    // Email/password login
    if ((email || username) && password) {
      const loginField = email ? { email: email.toLowerCase() } : { username: username.toLowerCase() };
      
      // Find user and include password field
      const user = await User.findOne(loginField).select('+password');
      
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      
      // Verify password
      if (!user.password || !user.verifyPassword(password)) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      
      // Generate JWT token
      const token = generateToken(user.email);
      
      return res.json({ 
        success: true, 
        token,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accountType: user.accountType,
          role: user.role,
          rating: user.rating,
          totalJobs: user.totalJobs
        },
        message: 'Login successful'
      });
      
    } else if (walletAddress && signature && message) {
      // Wallet login
      const isValid = verifySignature(message, signature, walletAddress);
      
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }
      
      // Find or create user
      let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      
      if (!user) {
        user = new User({
          walletAddress: walletAddress.toLowerCase(),
          role: 'customer',
          accountType: 'customer'
        });
        await user.save();
      }
      
      // Generate JWT token
      const token = generateToken(walletAddress);
      
      return res.json({ 
        success: true, 
        token,
        user: {
          walletAddress: user.walletAddress,
          role: user.role,
          accountType: user.accountType,
          rating: user.rating,
          totalJobs: user.totalJobs
        },
        message: 'Login successful'
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Email/password or wallet credentials required' 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/register
 * Register new user with email/password or wallet
 */
router.post('/register', async (req, res) => {
  try {
    const { 
      // Email/password registration
      firstName, 
      lastName, 
      email, 
      password, 
      phone, 
      accountType,
      // Wallet registration
      walletAddress, 
      signature, 
      message 
    } = req.body;
    
    // Check registration type
    if (email && password) {
      // Traditional email/password registration
      if (!firstName || !lastName || !phone) {
        return res.status(400).json({ 
          success: false, 
          error: 'First name, last name, email, password, and phone required' 
        });
      }
      
      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }
      
      // Create username from email
      const username = email.split('@')[0].toLowerCase();
      
      // Generate a pseudo-wallet address for consistency (0x + random hex)
      const pseudoWallet = '0x' + crypto.randomBytes(20).toString('hex');
      
      // Create new user
      const user = new User({
        username,
        email: email.toLowerCase(),
        password, // Will be hashed by pre-save hook
        firstName,
        lastName,
        phone,
        walletAddress: pseudoWallet,
        accountType: accountType || 'customer',
        role: accountType === 'gigWorker' ? 'gigworker' : 'customer'
      });
      
      await user.save();
      
      // Generate JWT token
      const token = generateToken(email);
      
      return res.status(201).json({ 
        success: true, 
        token,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accountType: user.accountType,
          role: user.role
        },
        message: 'Registration successful'
      });
      
    } else if (walletAddress && signature && message) {
      // Wallet registration
      const isValid = verifySignature(message, signature, walletAddress);
      
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }
      
      // Check if user exists
      let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      
      if (user) {
        return res.status(400).json({ success: false, error: 'Wallet already registered' });
      }
      
      // Create new user
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        accountType: accountType || 'customer',
        role: accountType === 'gigWorker' ? 'gigworker' : 'customer'
      });
      
      await user.save();
      
      // Generate JWT token
      const token = generateToken(walletAddress);
      
      return res.status(201).json({ 
        success: true, 
        token,
        user: {
          walletAddress: user.walletAddress,
          accountType: user.accountType,
          role: user.role
        },
        message: 'Registration successful'
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Either email/password or wallet authentication required' 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get('/me', require('../utils/auth').authenticate, async (req, res) => {
  try {
    // Try to find by wallet address or email
    const user = await User.findOne({
      $or: [
        { walletAddress: req.user.walletAddress },
        { email: req.user.walletAddress } // walletAddress field might contain email for email-based auth
      ]
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      user: {
        walletAddress: user.walletAddress,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        accountType: user.accountType,
        role: user.role,
        rating: user.rating,
        totalJobs: user.totalJobs,
        completedJobs: user.completedJobs,
        isAvailable: user.isAvailable,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
