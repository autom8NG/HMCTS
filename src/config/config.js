require('dotenv').config({ 
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' 
});

// Validate JWT secrets on startup
function validateSecrets() {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT secrets are required! Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env file');
  }
  
  // In production, enforce strong secrets (at least 32 characters)
  if (process.env.NODE_ENV === 'production') {
    if (accessSecret.length < 32) {
      throw new Error('JWT_ACCESS_SECRET must be at least 32 characters in production');
    }
    if (refreshSecret.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production');
    }
    if (accessSecret === refreshSecret) {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
    }
  }
}

// Validate on module load
if (process.env.NODE_ENV !== 'test') {
  validateSecrets();
}

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    enforceHttps: process.env.ENFORCE_HTTPS === 'true' || process.env.NODE_ENV === 'production'
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTokenExpiry: parseInt(process.env.ACCESS_TOKEN_EXPIRY) || 900, // 15 minutes
    refreshTokenExpiry: parseInt(process.env.REFRESH_TOKEN_EXPIRY) || 604800 // 7 days
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:3001']
  },
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production'
  }
};
