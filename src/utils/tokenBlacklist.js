/**
 * In-Memory Token Blacklist
 * NOTE: This is a temporary solution. In production, use Redis or Database.
 * See SECURITY_ASSESSMENT.md for Redis implementation details.
 */

// Map to store blacklisted tokens: token -> expiryDate
const blacklistedTokens = new Map();
// Map to store user invalidation timestamps: userId -> timestamp
const userInvalidations = new Map();

class TokenBlacklist {
  /**
   * Blacklist a specific token
   */
  blacklistToken(token, expiresAt) {
    const expiry = new Date(expiresAt);
    const now = new Date();
    
    if (expiry > now) {
      blacklistedTokens.set(token, expiry);
    }
    
    // Clean up expired tokens periodically
    this.cleanup();
  }

  /**
   * Check if token is blacklisted
   */
  isBlacklisted(token) {
    if (!blacklistedTokens.has(token)) {
      return false;
    }
    
    const expiry = blacklistedTokens.get(token);
    const now = new Date();
    
    // Remove if expired
    if (now > expiry) {
      blacklistedTokens.delete(token);
      return false;
    }
    
    return true;
  }

  /**
   * Invalidate all tokens for a user (e.g., password change, account compromise)
   */
  invalidateAllUserTokens(userId) {
    userInvalidations.set(userId, Date.now());
  }

  /**
   * Check if token was issued before user invalidation
   */
  isTokenInvalidated(userId, issuedAt) {
    if (!userInvalidations.has(userId)) {
      return false;
    }
    
    const invalidationTime = userInvalidations.get(userId);
    const tokenIssueTime = typeof issuedAt === 'number' ? issuedAt * 1000 : issuedAt;
    
    return tokenIssueTime < invalidationTime;
  }

  /**
   * Remove user from invalidation list (use with caution)
   */
  removeUserInvalidation(userId) {
    userInvalidations.delete(userId);
  }

  /**
   * Clean up expired blacklisted tokens
   */
  cleanup() {
    const now = new Date();
    
    for (const [token, expiry] of blacklistedTokens.entries()) {
      if (now > expiry) {
        blacklistedTokens.delete(token);
      }
    }
  }

  /**
   * Get blacklist statistics (for monitoring)
   */
  getStats() {
    this.cleanup();
    return {
      blacklistedTokens: blacklistedTokens.size,
      invalidatedUsers: userInvalidations.size,
    };
  }

  /**
   * Clear all blacklisted tokens (testing only)
   */
  clearAll() {
    blacklistedTokens.clear();
    userInvalidations.clear();
  }
}

// Auto-cleanup every 5 minutes
const cleanupInterval = setInterval(() => {
  const blacklist = new TokenBlacklist();
  blacklist.cleanup();
}, 5 * 60 * 1000);

// Allow Node.js to exit even if this timer is active (prevents test hanging)
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

module.exports = new TokenBlacklist();
