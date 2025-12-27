const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

/**
 * GET /api/protected
 * Protected endpoint - requires valid access token
 */
router.get('/protected', authenticateToken, (req, res) => {
  res.status(200).json({
    message: 'This is a protected resource',
    user: {
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role
    }
  });
});

/**
 * GET /api/user/profile
 * User profile endpoint - requires authentication
 */
router.get('/user/profile', authenticateToken, (req, res) => {
  res.status(200).json({
    profile: {
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role
    }
  });
});

/**
 * GET /api/admin/dashboard
 * Admin only endpoint - requires admin role
 */
router.get('/admin/dashboard', authenticateToken, requireRole('admin'), (req, res) => {
  res.status(200).json({
    message: 'Welcome to admin dashboard',
    data: {
      totalUsers: 100,
      activeUsers: 75
    }
  });
});

/**
 * GET /api/admin/users
 * Admin only endpoint - list all users
 */
router.get('/admin/users', authenticateToken, requireRole('admin'), (req, res) => {
  res.status(200).json({
    users: [
      { id: '1', username: 'testuser', role: 'user' },
      { id: '2', username: 'admin', role: 'admin' }
    ]
  });
});

/**
 * GET /api/public
 * Public endpoint - no authentication required
 */
router.get('/public', (req, res) => {
  res.status(200).json({
    message: 'This is a public resource',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
