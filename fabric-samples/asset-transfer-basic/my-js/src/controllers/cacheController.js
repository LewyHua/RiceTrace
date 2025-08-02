const cacheService = require('../services/CacheService');
const { asyncHandler } = require('../middleware/errorMiddleware');

/**
 * Cache management controller
 * Handles cache-related operations for debugging and maintenance
 */

/**
 * Get cache statistics
 * GET /api/cache/stats
 */
const getCacheStats = asyncHandler(async (req, res) => {
  const stats = await cacheService.getCacheStats();
  
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
});

/**
 * Clear all cache entries
 * DELETE /api/cache/clear
 */
const clearAllCache = asyncHandler(async (req, res) => {
  await cacheService.clearAllCache();
  
  res.json({
    success: true,
    message: 'All cache entries cleared successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * Invalidate batch list cache for all roles
 * DELETE /api/cache/batch-list
 */
const invalidateBatchList = asyncHandler(async (req, res) => {
  await cacheService.invalidateBatchList();
  
  res.json({
    success: true,
    message: 'Batch list cache invalidated for all roles',
    timestamp: new Date().toISOString()
  });
});

/**
 * Invalidate cache for specific batch
 * DELETE /api/cache/batch/:id
 */
const invalidateBatchCache = asyncHandler(async (req, res) => {
  const { id: batchId } = req.params;
  
  await cacheService.invalidateBatchCache(batchId);
  
  res.json({
    success: true,
    message: `Cache invalidated for batch ${batchId}`,
    batchId,
    timestamp: new Date().toISOString()
  });
});

/**
 * Test cache connection
 * GET /api/cache/test
 */
const testCacheConnection = asyncHandler(async (req, res) => {
  try {
    await cacheService.connect();
    
    // Test basic operations
    const testKey = 'test:connection';
    const testValue = { test: true, timestamp: new Date().toISOString() };
    
    await cacheService.client.setEx(testKey, 60, JSON.stringify(testValue));
    const retrieved = await cacheService.client.get(testKey);
    await cacheService.client.del(testKey);
    
    const parsed = JSON.parse(retrieved);
    
    res.json({
      success: true,
      message: 'Cache connection test successful',
      data: {
        connected: cacheService.isConnected,
        testValue: parsed,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cache connection test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = {
  getCacheStats,
  clearAllCache,
  invalidateBatchList,
  invalidateBatchCache,
  testCacheConnection
}; 