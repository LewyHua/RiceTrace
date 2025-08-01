const { errorCodes } = require('../../config');

/**
 * Error handling middleware
 * Handles all types of errors and returns standardized error responses
 */

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    role: req.role,
    timestamp: new Date().toISOString()
  });

  // Parse error type and message
  const errorInfo = parseError(err);
  
  // Send standardized error response
  res.status(errorInfo.statusCode).json({
    error: errorInfo.code,
    message: errorInfo.message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ...(errorInfo.details && { details: errorInfo.details })
  });
}

/**
 * Parse error information
 * @param {Error} err - Error object
 * @returns {Object} Parsed error information
 */
function parseError(err) {
  const message = err.message || 'Unknown error';
  
  console.log('Parsing error:', message); // Debug log
  
  // Handle database query errors for invalid report IDs (must be first to catch specific DB errors)
  if (message.includes('Database query failed') && message.includes('invalid input syntax for type uuid')) {
    console.log('Matched UUID format error'); // Debug log
    return {
      code: errorCodes.VALIDATION_ERROR,
      message: 'Invalid report ID format. Report ID must be a valid UUID.',
      statusCode: 400
    };
  }
  
  // Handle general database query failures
  if (message.includes('Database query failed')) {
    return {
      code: errorCodes.VALIDATION_ERROR, 
      message: 'Invalid request: ' + message.replace('Database query failed: ', ''),
      statusCode: 400
    };
  }
  
  // Handle specific Oracle verification error messages
  if (message.includes('Oracle verification failed') || 
      message.includes('Report not found') ||
      message.includes('Report is pending review') ||
      message.includes('Report has been rejected')) {
    return {
      code: errorCodes.ORACLE_VERIFICATION_FAILED,
      message: message,
      statusCode: 400
    };
  }
  
  // Check if it's one of our defined error codes
  if (message.includes(errorCodes.PERMISSION_DENIED)) {
    return {
      code: errorCodes.PERMISSION_DENIED,
      message: message.replace(`${errorCodes.PERMISSION_DENIED}: `, ''),
      statusCode: 403
    };
  }
  
  if (message.includes(errorCodes.ROLE_MISSING)) {
    return {
      code: errorCodes.ROLE_MISSING,
      message: message.replace(`${errorCodes.ROLE_MISSING}: `, ''),
      statusCode: 400
    };
  }
  
  if (message.includes(errorCodes.VALIDATION_ERROR)) {
    return {
      code: errorCodes.VALIDATION_ERROR,
      message: message.replace(`${errorCodes.VALIDATION_ERROR}: `, ''),
      statusCode: 400
    };
  }
  
  if (message.includes(errorCodes.NOT_FOUND)) {
    return {
      code: errorCodes.NOT_FOUND,
      message: message.replace(`${errorCodes.NOT_FOUND}: `, ''),
      statusCode: 404
    };
  }
  
  if (message.includes(errorCodes.FABRIC_ERROR)) {
    return {
      code: errorCodes.FABRIC_ERROR,
      message: message.replace(`${errorCodes.FABRIC_ERROR}: `, ''),
      statusCode: 500,
      details: 'Hyperledger Fabric network connection or operation failed'
    };
  }
  
  if (message.includes(errorCodes.ORACLE_VERIFICATION_FAILED)) {
    return {
      code: errorCodes.ORACLE_VERIFICATION_FAILED,
      message: message.replace(`${errorCodes.ORACLE_VERIFICATION_FAILED}: `, ''),
      statusCode: 400
    };
  }

  // Handle specific Node.js errors
  if (err.code === 'ENOENT') {
    return {
      code: errorCodes.NOT_FOUND,
      message: 'File or resource not found',
      statusCode: 404
    };
  }
  
  if (err.code === 'ECONNREFUSED') {
    return {
      code: errorCodes.FABRIC_ERROR,
      message: 'Cannot connect to Fabric network',
      statusCode: 503,
      details: 'Fabric network may not be started or configured incorrectly'
    };
  }

  // Default internal server error  
  return {
    code: errorCodes.INTERNAL_ERROR,
    message: message, // Always show the actual error message now
    statusCode: 500
  };
}

/**
 * Asynchronous error wrapper
 * Capture errors in asynchronous route handlers and pass them to the error handling middleware
 * @param {Function} fn - Asynchronous route handler function
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 error handling middleware
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Route ${req.method} ${req.path} not found`);
  error.statusCode = 404;
  next(error);
}

/**
 * Business logic error generator
 */
class BusinessError extends Error {
  constructor(code, message, statusCode = 400) {
    super(`${code}: ${message}`);
    this.name = 'BusinessError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Create specific type of error
 */
const createError = {
  validation: (message) => new BusinessError(errorCodes.VALIDATION_ERROR, message, 400),
  notFound: (message) => new BusinessError(errorCodes.NOT_FOUND, message, 404),
  permission: (message) => new BusinessError(errorCodes.PERMISSION_DENIED, message, 403),
  fabric: (message) => new BusinessError(errorCodes.FABRIC_ERROR, message, 500),
  internal: (message) => new BusinessError(errorCodes.INTERNAL_ERROR, message, 500)
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  BusinessError,
  createError,
  parseError
}; 