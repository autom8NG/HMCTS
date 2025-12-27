const winston = require('winston');
const path = require('path');

/**
 * Test Logger Configuration
 * Implements structured logging for test execution tracking
 */

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(logColors);

// Custom format for test logs
const testLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Create logs directory path
const logsDir = path.join(__dirname, '../../logs');

// Create the logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: testLogFormat,
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'test-combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'test-error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Write test execution logs
    new winston.transports.File({
      filename: path.join(logsDir, 'test-execution.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  );
}

/**
 * Helper methods for structured test logging
 */
logger.testStart = (testSuite, testCase) => {
  logger.info(`🚀 Starting Test: ${testSuite} - ${testCase}`);
};

logger.testPass = (testSuite, testCase, duration) => {
  logger.info(`✅ PASS: ${testSuite} - ${testCase} (${duration}ms)`);
};

logger.testFail = (testSuite, testCase, error) => {
  logger.error(`❌ FAIL: ${testSuite} - ${testCase}`, {
    error: error.message,
    stack: error.stack,
  });
};

logger.testSkip = (testSuite, testCase) => {
  logger.warn(`⏭️  SKIP: ${testSuite} - ${testCase}`);
};

logger.apiRequest = (method, endpoint, data) => {
  logger.debug(`📤 API Request: ${method} ${endpoint}`, { data });
};

logger.apiResponse = (method, endpoint, status, data) => {
  logger.debug(`📥 API Response: ${method} ${endpoint} - ${status}`, { data });
};

logger.assertion = (description, expected, actual) => {
  logger.debug(`🔍 Assertion: ${description}`, { expected, actual });
};

logger.setupTeardown = (action, description) => {
  logger.info(`🔧 ${action}: ${description}`);
};

logger.testData = (description, data) => {
  logger.debug(`📊 Test Data: ${description}`, { data });
};

module.exports = logger;
