const winston = require('winston');
const path = require('path');

/**
 * Security Audit Logger
 * Logs all security-relevant events for forensic analysis
 */

// Create logs directory path
const logsDir = path.join(__dirname, '../../logs');

// Security logger with separate transport
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'security-audit.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'security-errors.log'),
      level: 'error',
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  securityLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

class AuditLogger {
  /**
   * Log security event
   */
  logSecurityEvent(event, details) {
    securityLogger.info('SECURITY_EVENT', {
      event,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log login attempt
   */
  logLogin(userId, username, ip, userAgent, success, reason = null) {
    this.logSecurityEvent('USER_LOGIN', {
      userId,
      username,
      ip,
      userAgent,
      success,
      reason,
      type: success ? 'SUCCESS' : 'FAILED',
    });
  }

  /**
   * Log token refresh
   */
  logTokenRefresh(userId, ip, success, reason = null) {
    this.logSecurityEvent('TOKEN_REFRESH', {
      userId,
      ip,
      success,
      reason,
    });
  }

  /**
   * Log logout
   */
  logLogout(userId, ip) {
    this.logSecurityEvent('USER_LOGOUT', {
      userId,
      ip,
    });
  }

  /**
   * Log password change
   */
  logPasswordChange(userId, ip, success = true) {
    this.logSecurityEvent('PASSWORD_CHANGE', {
      userId,
      ip,
      success,
    });
  }

  /**
   * Log role change
   */
  logRoleChange(userId, oldRole, newRole, adminId) {
    this.logSecurityEvent('ROLE_CHANGE', {
      userId,
      oldRole,
      newRole,
      changedBy: adminId,
    });
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(userId, ip, activity, details) {
    securityLogger.warn('SUSPICIOUS_ACTIVITY', {
      userId,
      ip,
      activity,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log token blacklist event
   */
  logTokenBlacklist(userId, tokenType, reason) {
    this.logSecurityEvent('TOKEN_BLACKLISTED', {
      userId,
      tokenType,
      reason,
    });
  }

  /**
   * Log authentication bypass attempt
   */
  logAuthBypassAttempt(ip, userAgent, details) {
    securityLogger.error('AUTH_BYPASS_ATTEMPT', {
      ip,
      userAgent,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log rate limit hit
   */
  logRateLimitHit(ip, endpoint, attempts) {
    securityLogger.warn('RATE_LIMIT_HIT', {
      ip,
      endpoint,
      attempts,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new AuditLogger();
