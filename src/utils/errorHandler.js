const winston = require('winston');

/**
 * Custom Error Classes for Better Error Handling
 */

class AppError extends Error {
  constructor(message, statusCode, errorCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', errorCode = 'invalid_grant') {
    super(message, 401, errorCode);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', errorCode = 'forbidden') {
    super(message, 403, errorCode);
  }
}

class ValidationError extends AppError {
  constructor(message, errorCode = 'invalid_request') {
    super(message, 400, errorCode);
  }
}

class TokenError extends AppError {
  constructor(message, errorCode = 'invalid_token') {
    super(message, 401, errorCode);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests', errorCode = 'too_many_requests') {
    super(message, 429, errorCode);
  }
}

/**
 * Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  // Log error with context (sanitized for production)
  const errorLog = {
    message: err.message,
    statusCode: err.statusCode || 500,
    errorCode: err.errorCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId,
    timestamp: new Date().toISOString(),
  };

  // Only log stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorLog.stack = err.stack;
    console.error('Error:', errorLog);
  } else {
    // In production, use proper logging (winston, etc.)
    // Don't log sensitive data
    console.error('Error:', {
      message: err.message,
      errorCode: err.errorCode,
      url: req.url,
    });
  }

  // Send sanitized error to client
  if (err.isOperational) {
    // Known operational error - safe to expose
    res.status(err.statusCode).json({
      error: err.errorCode,
      error_description: err.message,
    });
  } else {
    // Unknown error - don't expose details
    res.status(500).json({
      error: 'server_error',
      error_description: 'An unexpected error occurred',
    });
  }
}

module.exports = {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  TokenError,
  RateLimitError,
  errorHandler,
};
