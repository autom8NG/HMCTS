/**
 * Test Helper Utilities
 * Implements reusable test functions following DRY principle
 */

const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

/**
 * Utility function to generate hashed passwords for test users
 * @param {string} plainPassword - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function generateHashedPassword(plainPassword) {
  logger.testData('Generating hashed password', { length: plainPassword.length });
  return await bcrypt.hash(plainPassword, 10);
}

/**
 * Helper to wait for async operations
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  logger.debug(`⏳ Waiting for ${ms}ms`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock user credentials for testing
 * Design Pattern: Test Data Builder
 */
const testCredentials = {
  validUser: {
    username: 'testuser',
    password: 'Password123'
  },
  adminUser: {
    username: 'admin',
    password: 'Password123'
  },
  invalidUser: {
    username: 'wronguser',
    password: 'wrongpass'
  }
};

/**
 * Helper to extract tokens from response
 * @param {Object} response - Supertest response object
 * @returns {Object} Object containing access and refresh tokens
 */
function extractTokens(response) {
  const tokens = {
    accessToken: response.body.access_token,
    refreshToken: response.body.refresh_token
  };
  logger.testData('Extracted tokens', { 
    hasAccessToken: !!tokens.accessToken, 
    hasRefreshToken: !!tokens.refreshToken 
  });
  return tokens;
}

/**
 * Assert OAuth2 compliant error response
 * @param {Object} response - API response
 * @param {number} expectedStatus - Expected HTTP status code
 * @param {string} expectedError - Expected OAuth2 error code
 */
function assertOAuth2Error(response, expectedStatus, expectedError) {
  logger.assertion('OAuth2 Error Response', 
    { status: expectedStatus, error: expectedError },
    { status: response.status, error: response.body.error }
  );
  
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('error', expectedError);
  expect(response.body).toHaveProperty('error_description');
}

/**
 * Assert successful token response
 * @param {Object} response - API response
 */
function assertTokenResponse(response) {
  logger.assertion('Token Response', 
    'Valid OAuth2 token response',
    { status: response.status }
  );
  
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('access_token');
  expect(response.body).toHaveProperty('refresh_token');
  expect(response.body).toHaveProperty('token_type', 'Bearer');
  expect(response.body).toHaveProperty('expires_in');
}

/**
 * Create authenticated request with token
 * @param {Object} request - Supertest request
 * @param {string} token - Access token
 * @returns {Object} Request with authorization header
 */
function authenticatedRequest(request, token) {
  logger.apiRequest('Authenticated', request.url, { hasToken: !!token });
  return request.set('Authorization', `Bearer ${token}`);
}

/**
 * Test data cleanup helper
 * @param {Function} cleanupFn - Cleanup function to execute
 */
async function cleanupTestData(cleanupFn) {
  try {
    logger.setupTeardown('Cleanup', 'Executing cleanup function');
    await cleanupFn();
    logger.setupTeardown('Cleanup', 'Cleanup completed successfully');
  } catch (error) {
    logger.error('Cleanup failed', { error: error.message });
    throw error;
  }
}

module.exports = {
  generateHashedPassword,
  delay,
  testCredentials,
  extractTokens,
  assertOAuth2Error,
  assertTokenResponse,
  authenticatedRequest,
  cleanupTestData
};
