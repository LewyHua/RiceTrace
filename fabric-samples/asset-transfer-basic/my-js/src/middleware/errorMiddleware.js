const { errorCodes } = require('../../config');

/**
 * 统一错误处理中间件
 * 处理所有类型的错误并返回标准化的错误响应
 */

/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error('🚨 错误详情:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    role: req.role,
    timestamp: new Date().toISOString()
  });

  // 解析错误类型和消息
  const errorInfo = parseError(err);
  
  // 发送标准化错误响应
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
 * 解析错误信息
 * @param {Error} err - 错误对象
 * @returns {Object} 解析后的错误信息
 */
function parseError(err) {
  const message = err.message || 'Unknown error';
  
  console.log('🔍 Parsing error:', message); // Debug log
  
  // Handle database query errors for invalid report IDs (must be first to catch specific DB errors)
  if (message.includes('Database query failed') && message.includes('invalid input syntax for type uuid')) {
    console.log('✅ Matched UUID format error'); // Debug log
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
      details: 'Hyperledger Fabric 网络连接或操作失败'
    };
  }
  
  if (message.includes(errorCodes.ORACLE_VERIFICATION_FAILED)) {
    return {
      code: errorCodes.ORACLE_VERIFICATION_FAILED,
      message: message.replace(`${errorCodes.ORACLE_VERIFICATION_FAILED}: `, ''),
      statusCode: 400
    };
  }

  // 处理特定的Node.js错误
  if (err.code === 'ENOENT') {
    return {
      code: errorCodes.NOT_FOUND,
      message: '文件或资源不存在',
      statusCode: 404
    };
  }
  
  if (err.code === 'ECONNREFUSED') {
    return {
      code: errorCodes.FABRIC_ERROR,
      message: '无法连接到 Fabric 网络',
      statusCode: 503,
      details: 'Fabric 网络可能未启动或配置错误'
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
 * 异步错误包装器
 * 捕获异步路由处理器中的错误并传递给错误处理中间件
 * @param {Function} fn - 异步路由处理函数
 * @returns {Function} 包装后的函数
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 错误处理中间件
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`路由 ${req.method} ${req.path} 不存在`);
  error.statusCode = 404;
  next(error);
}

/**
 * 业务逻辑错误生成器
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
 * 创建特定类型的错误
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