const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

class TokenService {
  /**
   * Generate access token (JWT)
   */
  generateAccessToken(payload) {
    // Add a tiny random component to ensure uniqueness
    const timestamp = Date.now() + Math.random();
    return jwt.sign(
      {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        jti: timestamp.toString() // JWT ID for uniqueness
      },
      config.jwt.accessSecret,
      {
        expiresIn: config.jwt.accessTokenExpiry,
        issuer: 'oauth2-server',
        algorithm: 'HS256' // Explicitly specify algorithm
      }
    );
  }

  /**
   * Generate refresh token (JWT with unique ID)
   */
  generateRefreshToken(payload) {
    return jwt.sign(
      {
        userId: payload.userId,
        tokenId: uuidv4(), // Unique token ID for tracking
        type: 'refresh'
      },
      config.jwt.refreshSecret,
      {
        expiresIn: config.jwt.refreshTokenExpiry,
        issuer: 'oauth2-server',
        algorithm: 'HS256' // Explicitly specify algorithm
      }
    );
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.accessSecret, {
        algorithms: ['HS256'], // Enforce specific algorithm
        issuer: 'oauth2-server'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('ACCESS_TOKEN_EXPIRED');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('INVALID_ACCESS_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        algorithms: ['HS256'], // Enforce specific algorithm
        issuer: 'oauth2-server'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('INVALID_REFRESH_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (for inspection)
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Get token expiry date
   */
  getTokenExpiry(type = 'access') {
    const expiry = type === 'access' 
      ? config.jwt.accessTokenExpiry 
      : config.jwt.refreshTokenExpiry;
    
    return new Date(Date.now() + expiry * 1000);
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

module.exports = new TokenService();
