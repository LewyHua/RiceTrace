const express = require('express');
const batchController = require('../controllers/batchController');
const productController = require('../controllers/productController');
const reportController = require('../controllers/reportController');
const cacheController = require('../controllers/cacheController');
const { extractRole, checkRolePermission, validateRequest, validateParams, logUserAction } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply global logging middleware
router.use(logUserAction);

/**
 * Batch related routes
 */

// Get batch statistics (must be placed before dynamic routes)
router.get('/batch/stats', 
  ...checkRolePermission('getAll'), 
  batchController.getBatchStats
);

// Get Oracle service status
router.get('/oracle/status', 
  extractRole, // Only need to extract role, no permission restriction
  batchController.getOracleStatus
);

// ===================== New Unified API =====================

// Complete step and transfer - new unified endpoint
router.post('/v2/batch/:id/event',
  ...checkRolePermission('transfer'),
  validateParams(['id']),
  validateRequest(['fromOperator', 'toOperator', 'step', 'reportId']),
  batchController.completeStepAndTransfer
);

// Get current batch owner for auto-fill
router.get('/batch/:id/owner',
  ...checkRolePermission('getById'),
  validateParams(['id']),
  batchController.getCurrentBatchOwner
);

// ===================== Quality inspection report related routes =====================

// Upload quality inspection report (all roles can upload)
router.post('/reports/upload',
  extractRole, // Extract role information
  reportController.upload.single('report'), // Multer file upload middleware
  reportController.uploadReport
);

// Get my report list
router.get('/reports/my',
  extractRole,
  reportController.getMyReports
);

// Get report service status
router.get('/reports/status',
  extractRole,
  reportController.getReportStatus
);

// Verify report (for debugging)
router.get('/reports/:reportId/verify',
  extractRole,
  validateParams(['reportId']),
  reportController.verifyReport
);

// Get report details
router.get('/reports/:reportId',
  extractRole,
  validateParams(['reportId']),
  reportController.getReportById
);

// Admin update report status (for development testing)
router.post('/reports/admin/update-status',
  extractRole,
  validateRequest(['reportId', 'status']),
  reportController.updateReportStatus
);

// Get all batches
router.get('/batch', 
  ...checkRolePermission('getAll'), 
  batchController.getAllBatches
);

// Create batch (requires quality inspection report)
router.post('/batch', 
  ...checkRolePermission('create'),
  validateRequest(['reportId', 'location', 'variety', 'harvestDate', 'initialTestResult', 'owner', 'initialStep', 'operator']),
  batchController.createBatch
);

// Check if batch exists
router.get('/batch/:id/exists', 
  ...checkRolePermission('getById'),
  validateParams(['id']),
  batchController.checkBatchExists
);

// Transfer batch ownership (requires quality inspection report)
router.put('/batch/:id/transfer', 
  ...checkRolePermission('transfer'),
  validateParams(['id']),
  validateRequest(['reportId', 'newOwner', 'operator']),
  batchController.transferBatch
);

// Add quality inspection result (supports Oracle verification)
router.post('/batch/:id/test', 
  ...checkRolePermission('addTest'),
  validateParams(['id']),
  // Note: testId is not required, because Oracle mode only requires externalReportId
  batchController.addTestResult
);

// Add processing record
router.post('/batch/:id/process', 
  ...checkRolePermission('addProcess'),
  validateParams(['id']),
  validateRequest(['step', 'operator']),
  batchController.addProcessingRecord
);

// Get batch by ID (must be placed at the end to avoid conflicts with other routes)
router.get('/batch/:id', 
  ...checkRolePermission('getById'),
  validateParams(['id']),
  batchController.getBatchById
);

/**
 * Product related routes
 */

// Create product
router.post('/product', 
  ...checkRolePermission('createProduct'),
  validateRequest(['productId', 'batchId', 'packageDate', 'owner']),
  productController.createProduct
);

// Check if product exists
router.get('/product/:id/exists', 
  ...checkRolePermission('getProduct'),
  validateParams(['id']),
  productController.checkProductExists
);

// Get full traceability information of product
router.get('/product/:id/traceability', 
  ...checkRolePermission('getProduct'),
  validateParams(['id']),
  productController.getProductTraceability
);

// Get product by ID
router.get('/product/:id', 
  ...checkRolePermission('getProduct'),
  validateParams(['id']),
  productController.getProductById
);

/**
 * Cache management routes (for debugging and maintenance)
 */

// Get cache statistics
router.get('/cache/stats',
  extractRole,
  cacheController.getCacheStats
);

// Test cache connection
router.get('/cache/test',
  extractRole,
  cacheController.testCacheConnection
);

// Clear all cache entries
router.delete('/cache/clear',
  extractRole,
  cacheController.clearAllCache
);

// Invalidate batch list cache for all roles
router.delete('/cache/batch-list',
  extractRole,
  cacheController.invalidateBatchList
);

// Invalidate cache for specific batch
router.delete('/cache/batch/:id',
  extractRole,
  validateParams(['id']),
  cacheController.invalidateBatchCache
);

/**
 * System information routes
 */

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Rice supply chain traceability system is running normally',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API information
router.get('/info', (req, res) => {
  const { getAvailableRoles, permissions } = require('../../config');
  
  res.json({
    success: true,
    api: {
      name: 'Rice supply chain traceability system API',
      version: '1.0.0',
      description: 'Rice supply chain traceability system based on Hyperledger Fabric',
      roles: getAvailableRoles(),
      permissions: permissions,
      endpoints: {
        batch: [
          'GET /api/batch - Get all batches',
          'POST /api/batch - Create batch',
          'GET /api/batch/:id - Get specified batch',
          'GET /api/batch/:id/exists - Check if batch exists',
          'PUT /api/batch/:id/transfer - Transfer batch ownership',
          'POST /api/batch/:id/test - Add quality inspection result',
          'POST /api/batch/:id/process - Add processing record',
          'GET /api/batch/stats - Get batch statistics'
        ],
        product: [
          'POST /api/product - Create product',
          'GET /api/product/:id - Get product information',
          'GET /api/product/:id/exists - Check if product exists',
          'GET /api/product/:id/traceability - Get product traceability'
        ],
        system: [
          'GET /api/health - Health check',
          'GET /api/info - API information'
        ]
      }
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 