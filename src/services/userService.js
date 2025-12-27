const bcrypt = require('bcryptjs');

// In-memory user database (replace with real database in production)
const users = [
  {
    id: '1',
    username: 'testuser',
    password: '$2a$10$XWeWKRSy1hLbraVJr3NbjOhggEt2kdUf7UG/BLXRHpazyc1wBO/XS', // Password123
    email: 'testuser@example.com',
    role: 'user'
  },
  {
    id: '2',
    username: 'admin',
    password: '$2a$10$XWeWKRSy1hLbraVJr3NbjOhggEt2kdUf7UG/BLXRHpazyc1wBO/XS', // Password123
    email: 'admin@example.com',
    role: 'admin'
  }
];

// In-memory refresh token storage (replace with Redis or database in production)
const refreshTokens = new Map();

class UserService {
  /**
   * Find user by username
   */
  async findByUsername(username) {
    return users.find(user => user.username === username);
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    return users.find(user => user.id === id);
  }

  /**
   * Verify user password
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Store refresh token
   */
  async storeRefreshToken(userId, token, expiresAt) {
    if (!refreshTokens.has(userId)) {
      refreshTokens.set(userId, []);
    }
    
    const userTokens = refreshTokens.get(userId);
    userTokens.push({
      token,
      expiresAt,
      createdAt: new Date()
    });
    
    // Clean up expired tokens
    this.cleanupExpiredTokens(userId);
  }

  /**
   * Validate refresh token exists and is not expired
   */
  async validateRefreshToken(userId, token) {
    const userTokens = refreshTokens.get(userId);
    
    if (!userTokens) {
      return false;
    }

    const tokenData = userTokens.find(t => t.token === token);
    
    if (!tokenData) {
      return false;
    }

    // Check if token is expired
    if (new Date() > tokenData.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Revoke specific refresh token (for logout)
   */
  async revokeRefreshToken(userId, token) {
    const userTokens = refreshTokens.get(userId);
    
    if (!userTokens) {
      return false;
    }

    const index = userTokens.findIndex(t => t.token === token);
    
    if (index === -1) {
      return false;
    }

    userTokens.splice(index, 1);
    return true;
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllRefreshTokens(userId) {
    refreshTokens.delete(userId);
  }

  /**
   * Clean up expired tokens for a user
   */
  cleanupExpiredTokens(userId) {
    const userTokens = refreshTokens.get(userId);
    
    if (!userTokens) {
      return;
    }

    const now = new Date();
    const validTokens = userTokens.filter(t => t.expiresAt > now);
    
    if (validTokens.length === 0) {
      refreshTokens.delete(userId);
    } else {
      refreshTokens.set(userId, validTokens);
    }
  }

  /**
   * Get all stored refresh tokens (for testing)
   */
  getAllRefreshTokens() {
    return refreshTokens;
  }

  /**
   * Clear all refresh tokens (for testing)
   */
  clearAllRefreshTokens() {
    refreshTokens.clear();
  }
}

module.exports = new UserService();
