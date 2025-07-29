const { hasPermission, getAvailableRoles, errorCodes } = require('../../config');

/**
 * 权限验证中间件
 * 统一处理角色验证和权限检查
 */

/**
 * 角色提取中间件 - 从请求中提取用户角色
 */
function extractRole(req, res, next) {
  // 优先级：Header > Query Parameter > Default
  const role = req.headers['x-user-role'] || req.query.role || null;
  
  if (!role) {
    return res.status(400).json({
      error: errorCodes.ROLE_MISSING,
      message: '缺少角色信息，请在请求头中提供 X-User-Role 或在查询参数中提供 role',
      availableRoles: getAvailableRoles()
    });
  }

  // 验证角色是否有效 (admin角色用于管理功能)
  const validRoles = [...getAvailableRoles(), 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      error: errorCodes.ROLE_MISSING,
      message: `无效的角色: ${role}`,
      availableRoles: validRoles
    });
  }

  // 将角色信息添加到请求对象
  req.role = role;
  req.userInfo = {
    role,
    timestamp: new Date().toISOString()
  };

  console.log(`🔑 用户角色: ${role} | 端点: ${req.method} ${req.path}`);
  next();
}

/**
 * 权限检查中间件工厂函数
 * @param {string} requiredPermission - 需要的权限
 * @returns {Function} 中间件函数
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    // 确保角色已被提取
    if (!req.role) {
      return res.status(401).json({
        error: errorCodes.ROLE_MISSING,
        message: '用户角色信息缺失，请先通过角色验证'
      });
    }

    // 检查权限
    if (!hasPermission(req.role, requiredPermission)) {
      console.log(`❌ 权限拒绝: 角色 ${req.role} 尝试访问 ${requiredPermission}`);
      return res.status(403).json({
        error: errorCodes.PERMISSION_DENIED,
        message: `角色 '${req.role}' 没有权限执行此操作`,
        requiredPermission,
        userRole: req.role
      });
    }

    console.log(`✅ 权限验证通过: 角色 ${req.role} 访问 ${requiredPermission}`);
    next();
  };
}

/**
 * 组合的权限验证中间件 - 同时提取角色和检查权限
 * @param {string} requiredPermission - 需要的权限
 * @returns {Array} 中间件数组
 */
function checkRolePermission(requiredPermission) {
  return [extractRole, requirePermission(requiredPermission)];
}

/**
 * 角色信息记录中间件 - 记录用户操作日志
 */
function logUserAction(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    // 记录操作结果
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    const logLevel = isSuccess ? '✅' : '❌';
    
    console.log(`${logLevel} 操作完成: 角色=${req.role} | 方法=${req.method} | 路径=${req.path} | 状态=${res.statusCode}`);
    
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`📝 请求数据:`, { ...req.body, role: req.role });
    }

    // 调用原始的send方法
    originalSend.call(this, data);
  };

  next();
}

/**
 * 请求验证中间件 - 验证必需的请求参数
 * @param {Array} requiredFields - 必需的字段列表
 * @returns {Function} 中间件函数
 */
function validateRequest(requiredFields = []) {
  return (req, res, next) => {
    const missing = [];
    
    // 检查请求体中的必需字段
    for (const field of requiredFields) {
      if (req.body && req.body[field] === undefined) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: errorCodes.VALIDATION_ERROR,
        message: `缺少必需的字段: ${missing.join(', ')}`,
        requiredFields,
        provided: req.body ? Object.keys(req.body) : []
      });
    }

    next();
  };
}

/**
 * 参数验证中间件 - 验证路径参数
 * @param {Array} requiredParams - 必需的路径参数
 * @returns {Function} 中间件函数
 */
function validateParams(requiredParams = []) {
  return (req, res, next) => {
    const missing = [];
    
    // 检查路径参数
    for (const param of requiredParams) {
      if (!req.params[param]) {
        missing.push(param);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: errorCodes.VALIDATION_ERROR,
        message: `缺少必需的路径参数: ${missing.join(', ')}`,
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