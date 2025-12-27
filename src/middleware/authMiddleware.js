const tokenService = require('../services/tokenService');
const userService = require('../services/userService');
const tokenBlacklist = require('../utils/tokenBlacklist');
const auditLogger = require('../utils/auditLogger');
const { AuthenticationError, AuthorizationError } = require('../utils/errorHandler');

/**
 * Middleware to authenticate access token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = tokenService.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'No token provided'
      });
    }

    // Verify and decode token
    const decoded = tokenService.verifyAccessToken(token);

    // Check if token is blacklisted
    if (tokenBlacklist.isBlacklisted(token)) {
      auditLogger.logAuthBypassAttempt(req.ip, decoded.userId, 'blacklisted_token');
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Token has been revoked'
      });
    }

    // Check if all user tokens have been invalidated
    if (tokenBlacklist.isTokenInvalidated(decoded.userId)) {
      auditLogger.logAuthBypassAttempt(req.ip, decoded.userId, 'invalidated_user_tokens');
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'All user sessions have been terminated'
      });
    }

    // Verify user still exists and is active
    const user = await userService.findById(decoded.userId);
    if (!user) {
      auditLogger.logAuthBypassAttempt(req.ip, decoded.userId, 'user_not_found');
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'User not found'
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.message === 'ACCESS_TOKEN_EXPIRED') {
      return res.status(401).json({
        error: 'token_expired',
        error_description: 'Access token has expired'
      });
    } else if (error.message === 'INVALID_ACCESS_TOKEN') {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid access token'
      });
    }

    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Token validation failed'
    });
  }
};

/**
 * Middleware to check user roles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'forbidden',
        error_description: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Middleware to validate request body
 */
const validateLoginRequest = (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Username and password are required'
    });
  }

  next();
};

/**
 * Middleware to validate refresh token request
 */
const validateRefreshRequest = (req, res, next) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Refresh token is required'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  validateLoginRequest,
  validateRefreshRequest
};
