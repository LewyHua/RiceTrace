const { hasPermission, getAvailableRoles, errorCodes } = require('../../config');

/**
 * Authentication middleware
 * Handles role validation and permission checks
 */

/**
 * Role extraction middleware - Extract user role from request
 */
function extractRole(req, res, next) {
  // Priority: Header > Query Parameter > Default
  const role = req.headers['x-user-role'] || req.query.role || null;
  
  if (!role) {
    return res.status(400).json({
      error: errorCodes.ROLE_MISSING,
      message: 'Role information is missing, please provide X-User-Role in the request header or role in the query parameter',
      availableRoles: getAvailableRoles()
    });
  }

  // Validate role (admin role for management functionality)
  const validRoles = [...getAvailableRoles(), 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      error: errorCodes.ROLE_MISSING,
      message: `Invalid role: ${role}`,
      availableRoles: validRoles
    });
  }

  // Add role information to request object
  req.role = role;
  req.userInfo = {
    role,
    timestamp: new Date().toISOString()
  };

  console.log(`User role: ${role} | Endpoint: ${req.method} ${req.path}`);
  next();
}

/**
 * Permission check middleware factory function
 * @param {string} requiredPermission - Required permission
 * @returns {Function} Middleware function
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    // Ensure role has been extracted
    if (!req.role) {
      return res.status(401).json({
        error: errorCodes.ROLE_MISSING,
        message: 'User role information is missing, please verify the role first'
      });
    }

    // Check permission
    if (!hasPermission(req.role, requiredPermission)) {
      console.log(`Permission denied: role ${req.role} attempted to access ${requiredPermission}`);
      return res.status(403).json({
        error: errorCodes.PERMISSION_DENIED,
        message: `Role '${req.role}' does not have permission to perform this operation`,
        requiredPermission,
        userRole: req.role
      });
    }

    console.log(`Permission verified: role ${req.role} accessed ${requiredPermission}`);
    next();
  };
}

/**
 * Combined permission verification middleware - Extract role and check permission
 * @param {string} requiredPermission - Required permission
 * @returns {Array} Middleware array
 */
function checkRolePermission(requiredPermission) {
  return [extractRole, requirePermission(requiredPermission)];
}

/**
 * Role information recording middleware - Record user operation logs
 */
function logUserAction(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Record operation result
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    const logLevel = isSuccess ? '✅' : '❌';
    
    console.log(`${logLevel} Operation completed: role=${req.role} | method=${req.method} | path=${req.path} | status=${res.statusCode}`);
    
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`Request data:`, { ...req.body, role: req.role });
    }

    // Call the original send method
    originalSend.call(this, data);
  };

  next();
}

/**
 * Request validation middleware - Validate required request parameters
 * @param {Array} requiredFields - Required field list
 * @returns {Function} Middleware function
 */
function validateRequest(requiredFields = []) {
  return (req, res, next) => {
    const missing = [];
    
    // Check required fields in request body
    for (const field of requiredFields) {
      if (req.body && req.body[field] === undefined) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: errorCodes.VALIDATION_ERROR,
        message: `Missing required fields: ${missing.join(', ')}`,
        requiredFields,
        provided: req.body ? Object.keys(req.body) : []
      });
    }

    next();
  };
}

/**
 * Parameter validation middleware - Validate path parameters
 * @param {Array} requiredParams - Required path parameters
 * @returns {Function} Middleware function
 */
function validateParams(requiredParams = []) {
  return (req, res, next) => {
    const missing = [];
    
    // Check path parameters
    for (const param of requiredParams) {
      if (!req.params[param]) {
        missing.push(param);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: errorCodes.VALIDATION_ERROR,
        message: `Missing required path parameters: ${missing.join(', ')}`,
        requiredParams,
        provided: Object.keys(req.params)
      });
    }

    next();
  };
}

module.exports = {
  extractRole,
  requirePermission,
  checkRolePermission,
  logUserAction,
  validateRequest,
  validateParams
}; 