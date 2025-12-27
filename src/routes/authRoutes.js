const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const tokenService = require('../services/tokenService');
const userService = require('../services/userService');
const { validateLoginRequest, validateRefreshRequest } = require('../middleware/authMiddleware');
const { loginLimiter, refreshLimiter, logoutLimiter } = require('../middleware/rateLimiter');
const tokenBlacklist = require('../utils/tokenBlacklist');
const auditLogger = require('../utils/auditLogger');

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * POST /auth/login
 * Authenticate user and issue tokens
 */
router.post('/login', loginLimiter, validateLoginRequest, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Always perform full authentication flow (constant-time) to prevent user enumeration
    // Find user
    const user = await userService.findByUsername(username);
    
    // Dummy hash for constant-time comparison when user doesn't exist
    const dummyHash = '$2a$10$dummy.hash.for.timing.safety.to.prevent.user.enumeration';
    const passwordHash = user ? user.password : dummyHash;

    // Verify password (always runs even if user doesn't exist)
    const isValidPassword = await userService.verifyPassword(password, passwordHash);

    // Only proceed if both user exists AND password is valid
    if (!user || !isValidPassword) {
      auditLogger.logLogin(username, false, req.ip, req.get('user-agent'));
      return res.status(401).json({
        error: 'invalid_grant',
        error_description: 'Invalid username or password'
      });
    }

    // Generate tokens
    const accessToken = tokenService.generateAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    const refreshToken = tokenService.generateRefreshToken({
      userId: user.id
    });

    // Store refresh token
    const refreshTokenExpiry = tokenService.getTokenExpiry('refresh');
    await userService.storeRefreshToken(user.id, refreshToken, refreshTokenExpiry);

    // Log successful login
    auditLogger.logLogin(user.id, user.username, req.ip, req.get('user-agent'), true);

    // Return tokens
    res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: tokenService.getTokenExpiry('access')
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'An error occurred during authentication'
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', refreshLimiter, validateRefreshRequest, async (req, res) => {
  try {
    const { refresh_token } = req.body;

    // Verify refresh token
    let decoded;
    try {
      decoded = tokenService.verifyRefreshToken(refresh_token);
    } catch (error) {
      auditLogger.logTokenRefresh(null, req.ip, false, 'invalid_token');
      if (error.message === 'REFRESH_TOKEN_EXPIRED') {
        return res.status(401).json({
          error: 'invalid_grant',
          error_description: 'Refresh token has expired'
        });
      } else if (error.message === 'INVALID_REFRESH_TOKEN') {
        return res.status(401).json({
          error: 'invalid_grant',
          error_description: 'Invalid refresh token'
        });
      }
      throw error;
    }

    // Check if token is blacklisted
    if (tokenBlacklist.isBlacklisted(refresh_token)) {
      auditLogger.logSuspiciousActivity(decoded.userId, 'blacklisted_token_use', req.ip, {
        tokenType: 'refresh'
      });
      return res.status(401).json({
        error: 'invalid_grant',
        error_description: 'Refresh token has been revoked'
      });
    }

    // Validate refresh token exists in storage
    const isValid = await userService.validateRefreshToken(decoded.userId, refresh_token);

    if (!isValid) {
      auditLogger.logTokenRefresh(decoded.userId, req.ip, false, 'token_not_in_storage');
      return res.status(401).json({
        error: 'invalid_grant',
        error_description: 'Refresh token is invalid or has been revoked'
      });
    }

    // Get user data
    const user = await userService.findById(decoded.userId);

    if (!user) {
      auditLogger.logTokenRefresh(decoded.userId, req.ip, false, 'user_not_found');
      return res.status(401).json({
        error: 'invalid_grant',
        error_description: 'User not found'
      });
    }

    // Generate new access token
    const accessToken = tokenService.generateAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Implement refresh token rotation (security best practice)
    const newRefreshToken = tokenService.generateRefreshToken({
      userId: user.id
    });

    // Blacklist old refresh token
    tokenBlacklist.blacklistToken(refresh_token, decoded.exp);

    // Revoke old refresh token
    await userService.revokeRefreshToken(decoded.userId, refresh_token);

    // Store new refresh token
    const refreshTokenExpiry = tokenService.getTokenExpiry('refresh');
    await userService.storeRefreshToken(user.id, newRefreshToken, refreshTokenExpiry);
req.ip, true
    // Log successful token refresh
    auditLogger.logTokenRefresh(user.id, true, req.ip);

    res.status(200).json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: tokenService.getTokenExpiry('access')
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'An error occurred during token refresh'
    });
  }
});

/**
 * POST /auth/logout
 * Revoke tokens and blacklist them
 */
router.post('/logout', logoutLimiter, async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const accessToken = tokenService.extractTokenFromHeader(req.headers.authorization);

    if (!refresh_token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Refresh token is required'
      });
    }

    // Decode tokens to get user ID and expiry
    const refreshDecoded = tokenService.decodeToken(refresh_token);
    
    if (!refreshDecoded || !refreshDecoded.userId) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid refresh token format'
      });
    }

    // Blacklist the refresh token
    tokenBlacklist.blacklistToken(refresh_token, refreshDecoded.exp);

    // Also blacklist access token if provided
    if (accessToken) {
      const accessDecoded = tokenService.decodeToken(accessToken);
      if (accessDecoded && accessDecoded.exp) {
        tokenBlacklist.blacklistToken(accessToken, accessDecoded.exp);
      }
    }

    // Revoke refresh token from storage
    await userService.revokeRefreshToken(refreshDecoded.userId, refresh_token);

    // Log logout
    auditLogger.logLogout(refreshDecoded.userId, req.ip);

    res.status(200).json({
      message: 'Successfully logged out'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'An error occurred during logout'
    });
  }
});

module.exports = router;
