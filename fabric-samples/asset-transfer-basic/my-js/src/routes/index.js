const express = require('express');
const batchController = require('../controllers/batchController');
const productController = require('../controllers/productController');
const { checkRolePermission, validateRequest, validateParams, logUserAction } = require('../middleware/authMiddleware');

const router = express.Router();

// 应用全局日志中间件
router.use(logUserAction);

/**
 * 批次相关路由
 */

// 获取批次统计信息（需要放在动态路由前面）
router.get('/batch/stats', 
  ...checkRolePermission('getAll'), 
  batchController.getBatchStats
);

// 获取所有批次
router.get('/batch', 
  ...checkRolePermission('getAll'), 
  batchController.getAllBatches
);

// 创建批次
router.post('/batch', 
  ...checkRolePermission('create'),
  validateRequest(['location', 'variety', 'harvestDate', 'initialTestResult', 'owner', 'initialStep', 'operator']),
  batchController.createBatch
);

// 检查批次是否存在
router.get('/batch/:id/exists', 
  ...checkRolePermission('getById'),
  validateParams(['id']),
  batchController.checkBatchExists
);

// 转移批次所有权
router.put('/batch/:id/transfer', 
  ...checkRolePermission('transfer'),
  validateParams(['id']),
  validateRequest(['newOwner', 'operator']),
  batchController.transferBatch
);

// 添加质检结果
router.post('/batch/:id/test', 
  ...checkRolePermission('addTest'),
  validateParams(['id']),
  validateRequest(['testId', 'testerId', 'result']),
  batchController.addTestResult
);

// 添加加工记录
router.post('/batch/:id/process', 
  ...checkRolePermission('addProcess'),
  validateParams(['id']),
  validateRequest(['step', 'operator']),
  batchController.addProcessingRecord
);

// 根据ID获取批次（需要放在最后，避免与其他路由冲突）
router.get('/batch/:id', 
  ...checkRolePermission('getById'),
  validateParams(['id']),
  batchController.getBatchById
);

/**
 * 产品相关路由
 */

// 创建产品
router.post('/product', 
  ...checkRolePermission('createProduct'),
  validateRequest(['productId', 'batchId', 'packageDate', 'owner']),
  productController.createProduct
);

// 检查产品是否存在
router.get('/product/:id/exists', 
  ...checkRolePermission('getProduct'),
  validateParams(['id']),
  productController.checkProductExists
);

// 获取产品的完整追溯信息
router.get('/product/:id/traceability', 
  ...checkRolePermission('getProduct'),
  validateParams(['id']),
  productController.getProductTraceability
);

// 根据ID获取产品
router.get('/product/:id', 
  ...checkRolePermission('getProduct'),
  validateParams(['id']),
  productController.getProductById
);

/**
 * 系统信息路由
 */

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '大米供应链追溯系统运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API信息
router.get('/info', (req, res) => {
  const { getAvailableRoles, permissions } = require('../../config');
  
  res.json({
    success: true,
    api: {
      name: '大米供应链追溯系统 API',
      version: '1.0.0',
      description: '基于 Hyperledger Fabric 的大米供应链追溯系统',
      roles: getAvailableRoles(),
      permissions: permissions,
      endpoints: {
        batch: [
          'GET /api/batch - 获取所有批次',
          'POST /api/batch - 创建批次',
          'GET /api/batch/:id - 获取指定批次',
          'GET /api/batch/:id/exists - 检查批次是否存在',
          'PUT /api/batch/:id/transfer - 转移批次所有权',
          'POST /api/batch/:id/test - 添加质检结果',
          'POST /api/batch/:id/process - 添加加工记录',
          'GET /api/batch/stats - 获取批次统计信息'
        ],
        product: [
          'POST /api/product - 创建产品',
          'GET /api/product/:id - 获取产品信息',
          'GET /api/product/:id/exists - 检查产品是否存在',
          'GET /api/product/:id/traceability - 获取产品追溯信息'
        ],
        system: [
          'GET /api/health - 健康检查',
          'GET /api/info - API信息'
        ]
      }
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 