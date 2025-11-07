const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const crypto = require('crypto');

// Generate random confirmation codes
function generateCode() {
  // Return a 4-digit numeric code as a zero-padded string, e.g., "0384"
  const n = crypto.randomInt(0, 10000);
  return n.toString().padStart(4, '0');
}

// GET /api/jobs - Get all jobs (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { status, customerId, gigWorkerId } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (gigWorkerId) filter.gigWorkerId = gigWorkerId;
    
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jobs/available - Get available jobs for gig workers
router.get('/available', async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'open', paid: true })
      .select('+deliveryAddressPlain')  // Include the plain delivery address
      .sort({ amount: -1 });
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jobs/my-jobs - Get jobs for current user
router.get('/my-jobs', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID required' 
      });
    }
    
    // Find jobs where user is either customer or gig worker
    const jobsRaw = await Job.find({
      $or: [
        { customerId: userId },
        { customerWallet: userId },
        { gigWorkerId: userId },
        { gigWorkerWallet: userId }
      ]
    }).sort({ createdAt: -1 })
      .select('+deliveryAddressPlain')
      .lean();
    
    // Only expose plain delivery address to assigned gig worker after pickup
    const jobs = jobsRaw.map(j => {
      const isAssignedWorker = j.gigWorkerId === userId || j.gigWorkerWallet === userId;
      const canSeeAddress = isAssignedWorker && (j.status === 'accepted' || j.status === 'picked_up' || j.status === 'delivered');
      if (!canSeeAddress) {
        delete j.deliveryAddressPlain;
      }
      return j;
    });
    
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jobs/:id - Get specific job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs - Create new job
router.post('/', async (req, res) => {
  try {
    const {
      customerId,
      customerWallet,
      packageSize,
      lockerLocation,
      lockerCode,
      lockerCoords,
      deliveryAddress,
      deliveryCoords,
      deliveryInstructions,
      distanceKm,
      amount,
      platformFee
    } = req.body;
    
    // Validate required fields
    if (!customerId || !customerWallet || !lockerLocation || !lockerCode || !deliveryAddress || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Generate confirmation codes
    const pickupConfirmationCode = generateCode();
    const deliveryConfirmationCode = generateCode();
    
    const job = new Job({
      customerId,
      customerWallet,
      packageSize: packageSize || 'small',
      lockerLocation,
      lockerCode,
      lockerCoords,
      deliveryAddress,
      deliveryCoords,
      deliveryInstructions,
      distanceKm: distanceKm || 0,
      amount,
      platformFee: platformFee || (amount * 0.1),
      pickupConfirmationCode,
      deliveryConfirmationCode,
      status: 'open',
      paid: false  // Will be set to true after smart contract payment
    });
    
    await job.save();
    
    res.status(201).json({ 
      success: true, 
      job,
      message: 'Job created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/accept - Gig worker accepts job
router.post('/:id/accept', async (req, res) => {
  try {
    const { gigWorkerId, gigWorkerWallet, gigWorkerName } = req.body;
    
    if (!gigWorkerId || !gigWorkerWallet) {
      return res.status(400).json({ 
        success: false, 
        error: 'Gig worker ID and wallet required' 
      });
    }
    
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    if (job.status !== 'open') {
      return res.status(400).json({ 
        success: false, 
        error: 'Job is not available' 
      });
    }
    
    // Prevent worker from accepting their own order
    if (job.customerId === gigWorkerId || job.customerWallet === gigWorkerWallet) {
      return res.status(400).json({ 
        success: false, 
        error: 'You cannot accept your own order' 
      });
    }
    
    job.gigWorkerId = gigWorkerId;
    job.gigWorkerWallet = gigWorkerWallet;
    job.gigWorkerName = gigWorkerName || 'Anonymous Worker';
    job.status = 'accepted';
    job.acceptedAt = new Date();
    
    await job.save();
    
    res.json({ 
      success: true, 
      job,
      message: 'Job accepted successfully',
      lockerCode: job.lockerCode
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/decline - Gig worker declines/cancels accepted job
router.post('/:id/decline', async (req, res) => {
  try {
    const { gigWorkerId } = req.body;
    
    if (!gigWorkerId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Gig worker ID required' 
      });
    }
    
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    if (job.status !== 'accepted') {
      return res.status(400).json({ 
        success: false, 
        error: 'Can only decline jobs in accepted status' 
      });
    }
    
    if (job.gigWorkerId !== gigWorkerId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized - not assigned to you' 
      });
    }
    
    // Reset job to open status
    job.gigWorkerId = null;
    job.gigWorkerWallet = null;
    job.status = 'open';
    job.acceptedAt = null;
    
    await job.save();
    
    res.json({ 
      success: true, 
      job,
      message: 'Job declined and returned to available jobs'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/pickup - Confirm pickup from locker
router.post('/:id/pickup', async (req, res) => {
  try {
    const { gigWorkerId } = req.body;
    
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    if (job.status !== 'accepted') {
      return res.status(400).json({ 
        success: false, 
        error: 'Job must be in accepted status' 
      });
    }
    
    if (job.gigWorkerId !== gigWorkerId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized - not assigned to you' 
      });
    }
    
    job.status = 'picked_up';
    job.pickedUpAt = new Date();
    
    await job.save();
    
    // Fetch plain address for gig worker
    const jobWithAddress = await Job.findById(job._id).select('+deliveryAddressPlain');
    
    res.json({ 
      success: true, 
      job,
      message: 'Pickup confirmed',
      deliveryAddress: jobWithAddress.deliveryAddressPlain || 'Address encrypted',
      deliveryInstructions: job.deliveryInstructions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/deliver - Confirm delivery
router.post('/:id/deliver', async (req, res) => {
  try {
    const { gigWorkerId, deliveryConfirmationCode } = req.body;
    
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    if (job.status !== 'picked_up') {
      return res.status(400).json({ 
        success: false, 
        error: 'Job must be in picked_up status' 
      });
    }
    
    if (job.gigWorkerId !== gigWorkerId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    // Verify delivery confirmation code
    if (!deliveryConfirmationCode || deliveryConfirmationCode !== job.deliveryConfirmationCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid delivery confirmation code. Get this code from the customer.' 
      });
    }
    
    job.status = 'delivered';
    job.deliveredAt = new Date();
    
    await job.save();
    
    // Update gig worker's completed jobs count
    const User = require('../models/User');
    const gigWorker = await User.findOne({ 
      $or: [
        { walletAddress: job.gigWorkerId },
        { email: job.gigWorkerId }
      ]
    });
    
    if (gigWorker) {
      gigWorker.completedJobs = (gigWorker.completedJobs || 0) + 1;
      await gigWorker.save();
    }
    
    res.json({ 
      success: true, 
      job,
      message: 'Delivery confirmed! Payment will be processed.',
      payout: job.amount - job.platformFee
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/pay - Confirm payment received (customer pays via MetaMask)
router.post('/:id/pay', async (req, res) => {
  try {
    const { transactionHash, amount, cryptocurrency, tokenSymbol, amountCrypto, contractAddress, network, chainId } = req.body;
    
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Prevent duplicate payments
    if (job.paid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment already processed for this job' 
      });
    }
    
    if (job.status !== 'open') {
      return res.status(400).json({ 
        success: false, 
        error: 'Job already processed or cancelled' 
      });
    }
    
    // Store transaction details
    job.contractTxHash = transactionHash;
    job.paid = true;
    job.paidAt = new Date();
    job.status = 'open'; // Keep as open so gig workers can accept
    
    // Optional blockchain metadata for later integration
    if (cryptocurrency) job.cryptocurrency = cryptocurrency;
    if (tokenSymbol) job.tokenSymbol = tokenSymbol;
    if (typeof amountCrypto !== 'undefined') job.amountCrypto = Number(amountCrypto);
    if (contractAddress) job.contractAddress = contractAddress;
    if (network) job.network = network;
    if (chainId) job.chainId = chainId;
    
    await job.save();
    
    res.json({ 
      success: true, 
      job,
      message: 'Payment confirmed - funds in escrow'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/cancel - Cancel job (customer only, before accepted)
router.post('/:id/cancel', async (req, res) => {
  try {
    const { customerId } = req.body;
    
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    if (job.customerId !== customerId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    if (job.status !== 'open') {
      return res.status(400).json({ 
        success: false, 
        error: 'Can only cancel jobs that are open' 
      });
    }
    
    job.status = 'cancelled';
    await job.save();
    
    res.json({ 
      success: true, 
      job,
      message: 'Job cancelled successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jobs/:id/rate - Customer rates gig worker
router.post('/:id/rate', async (req, res) => {
  try {
    const { customerId, rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rating must be between 1 and 5' 
      });
    }
    
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    if (job.customerId !== customerId && job.customerWallet !== customerId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    if (job.status !== 'delivered') {
      return res.status(400).json({ 
        success: false, 
        error: 'Can only rate delivered jobs' 
      });
    }
    
    if (job.gigWorkerRating) {
      return res.status(400).json({ 
        success: false, 
        error: 'Job already rated' 
      });
    }
    
    job.gigWorkerRating = rating;
    await job.save();
    
    // Update gig worker's overall rating
    const User = require('../models/User');
    const gigWorker = await User.findOne({ 
      $or: [
        { walletAddress: job.gigWorkerId },
        { email: job.gigWorkerId }
      ]
    });
    
    if (gigWorker) {
      // Find all jobs for this gig worker that have been rated
      const ratedJobs = await Job.find({
        gigWorkerId: job.gigWorkerId,
        gigWorkerRating: { $exists: true, $ne: null }
      });
      
      // Calculate average from all rated jobs
      if (ratedJobs.length > 0) {
        const totalRating = ratedJobs.reduce((sum, j) => sum + j.gigWorkerRating, 0);
        gigWorker.rating = parseFloat((totalRating / ratedJobs.length).toFixed(2));
        await gigWorker.save();
      }
    }
    
    res.json({ 
      success: true, 
      job,
      message: 'Rating submitted successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
