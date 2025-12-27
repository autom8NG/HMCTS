/**
 * Jest Global Setup and Configuration
 * Implements test lifecycle management, logging, and environment setup
 */

const logger = require('./config/logger');
const userService = require('../src/services/userService');

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for tests that wait for token expiry
jest.setTimeout(40000);

// Track test execution statistics
const testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: null,
  endTime: null,
};

// Global test setup
beforeAll(() => {
  testStats.startTime = new Date();
  logger.info('╔════════════════════════════════════════════════════════════╗');
  logger.info('║         OAuth2 Authentication Test Suite - START          ║');
  logger.info('╚════════════════════════════════════════════════════════════╝');
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Node Version: ${process.version}`);
  logger.info(`Test Timeout: ${40000}ms`);
  logger.setupTeardown('Setup', 'Initializing test environment');
});

// Global test teardown
afterAll(() => {
  testStats.endTime = new Date();
  const duration = testStats.endTime - testStats.startTime;
  
  // Clean up all test data
  logger.setupTeardown('Teardown', 'Cleaning up test data');
  userService.clearAllRefreshTokens();
  
  logger.info('╔════════════════════════════════════════════════════════════╗');
  logger.info('║         OAuth2 Authentication Test Suite - END            ║');
  logger.info('╚════════════════════════════════════════════════════════════╝');
  logger.info(`Total Duration: ${duration}ms`);
  logger.info(`Test Statistics:`);
  logger.info(`  Total: ${testStats.total}`);
  logger.info(`  Passed: ${testStats.passed}`);
  logger.info(`  Failed: ${testStats.failed}`);
  logger.info(`  Skipped: ${testStats.skipped}`);
});

// Track individual test results
afterEach(() => {
  const testState = expect.getState();
  testStats.total++;
  
  if (testState.currentTestName) {
    // Test result will be captured by Jest reporters
  }
});

module.exports = { testStats };
