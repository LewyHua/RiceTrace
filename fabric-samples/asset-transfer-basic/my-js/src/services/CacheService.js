const redis = require('redis');
const config = require('../../config');

/**
 * Redis Cache Service
 * Handles caching of batch data to improve query performance
 */
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      this.client = redis.createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port
        },
        password: config.redis.password,
        database: config.redis.db
      });

      // Handle connection events
      this.client.on('connect', () => {
        console.log('Redis client connected');
        this.isConnected = true;
        this.retryCount = 0;
      });

      this.client.on('error', (err) => {
        console.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Get cache key for batch list
   * @param {string} role - User role
   * @returns {string} Cache key
   */
  _getBatchListKey(role) {
    return `${config.redis.cache.keys.batchList}:${role}`;
  }

  /**
   * Get cache key for batch detail
   * @param {string} batchId - Batch ID
   * @returns {string} Cache key
   */
  _getBatchDetailKey(batchId) {
    return `${config.redis.cache.keys.batchDetail}:${batchId}`;
  }

  /**
   * Get cache key for batch existence check
   * @param {string} batchId - Batch ID
   * @returns {string} Cache key
   */
  _getBatchExistsKey(batchId) {
    return `${config.redis.cache.keys.batchExists}:${batchId}`;
  }

  /**
   * Get batch list from cache
   * @param {string} role - User role
   * @returns {Promise<Array|null>} Cached batch list or null if not found
   */
  async getBatchList(role) {
    try {
      await this.connect();
      const key = this._getBatchListKey(role);
      const cached = await this.client.get(key);
      
      if (cached) {
        console.log(`Cache hit: batch list for role ${role}`);
        return JSON.parse(cached);
      }
      
      console.log(`Cache miss: batch list for role ${role}`);
      return null;
    } catch (error) {
      console.error('Error getting batch list from cache:', error);
      return null;
    }
  }

  /**
   * Set batch list in cache
   * @param {string} role - User role
   * @param {Array} batches - Batch list
   */
  async setBatchList(role, batches) {
    try {
      await this.connect();
      const key = this._getBatchListKey(role);
      const ttl = config.redis.cache.ttl.batchList;
      
      await this.client.setEx(key, ttl, JSON.stringify(batches));
      console.log(`Cached batch list for role ${role} with TTL ${ttl}s`);
    } catch (error) {
      console.error('Error setting batch list in cache:', error);
    }
  }

  /**
   * Get batch detail from cache
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object|null>} Cached batch detail or null if not found
   */
  async getBatchDetail(batchId) {
    try {
      await this.connect();
      const key = this._getBatchDetailKey(batchId);
      const cached = await this.client.get(key);
      
      if (cached) {
        console.log(`Cache hit: batch detail for ${batchId}`);
        return JSON.parse(cached);
      }
      
      console.log(`Cache miss: batch detail for ${batchId}`);
      return null;
    } catch (error) {
      console.error('Error getting batch detail from cache:', error);
      return null;
    }
  }

  /**
   * Set batch detail in cache
   * @param {string} batchId - Batch ID
   * @param {Object} batch - Batch data
   */
  async setBatchDetail(batchId, batch) {
    try {
      await this.connect();
      const key = this._getBatchDetailKey(batchId);
      const ttl = config.redis.cache.ttl.batchDetail;
      
      await this.client.setEx(key, ttl, JSON.stringify(batch));
      console.log(`Cached batch detail for ${batchId} with TTL ${ttl}s`);
    } catch (error) {
      console.error('Error setting batch detail in cache:', error);
    }
  }

  /**
   * Get batch existence from cache
   * @param {string} batchId - Batch ID
   * @returns {Promise<boolean|null>} Cached existence result or null if not found
   */
  async getBatchExists(batchId) {
    try {
      await this.connect();
      const key = this._getBatchExistsKey(batchId);
      const cached = await this.client.get(key);
      
      if (cached !== null) {
        console.log(`Cache hit: batch exists for ${batchId}`);
        return cached === 'true';
      }
      
      console.log(`Cache miss: batch exists for ${batchId}`);
      return null;
    } catch (error) {
      console.error('Error getting batch exists from cache:', error);
      return null;
    }
  }

  /**
   * Set batch existence in cache
   * @param {string} batchId - Batch ID
   * @param {boolean} exists - Whether batch exists
   */
  async setBatchExists(batchId, exists) {
    try {
      await this.connect();
      const key = this._getBatchExistsKey(batchId);
      const ttl = config.redis.cache.ttl.batchExists;
      
      await this.client.setEx(key, ttl, exists.toString());
      console.log(`Cached batch exists for ${batchId}: ${exists} with TTL ${ttl}s`);
    } catch (error) {
      console.error('Error setting batch exists in cache:', error);
    }
  }

  /**
   * Invalidate batch list cache for all roles
   */
  async invalidateBatchList() {
    try {
      await this.connect();
      const roles = config.getAvailableRoles();
      
      for (const role of roles) {
        const key = this._getBatchListKey(role);
        await this.client.del(key);
        console.log(`Invalidated batch list cache for role ${role}`);
      }
    } catch (error) {
      console.error('Error invalidating batch list cache:', error);
    }
  }

  /**
   * Invalidate batch detail cache
   * @param {string} batchId - Batch ID
   */
  async invalidateBatchDetail(batchId) {
    try {
      await this.connect();
      const key = this._getBatchDetailKey(batchId);
      await this.client.del(key);
      console.log(`Invalidated batch detail cache for ${batchId}`);
    } catch (error) {
      console.error('Error invalidating batch detail cache:', error);
    }
  }

  /**
   * Invalidate batch existence cache
   * @param {string} batchId - Batch ID
   */
  async invalidateBatchExists(batchId) {
    try {
      await this.connect();
      const key = this._getBatchExistsKey(batchId);
      await this.client.del(key);
      console.log(`Invalidated batch exists cache for ${batchId}`);
    } catch (error) {
      console.error('Error invalidating batch exists cache:', error);
    }
  }

  /**
   * Invalidate all cache entries for a specific batch
   * @param {string} batchId - Batch ID
   */
  async invalidateBatchCache(batchId) {
    try {
      await this.connect();
      
      // Invalidate batch detail and existence cache
      await this.invalidateBatchDetail(batchId);
      await this.invalidateBatchExists(batchId);
      
      // Also invalidate batch list cache since the batch data has changed
      await this.invalidateBatchList();
      
      console.log(`Invalidated all cache entries for batch ${batchId}`);
    } catch (error) {
      console.error('Error invalidating batch cache:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAllCache() {
    try {
      await this.connect();
      await this.client.flushDb();
      console.log('Cleared all cache entries');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats() {
    try {
      await this.connect();
      const info = await this.client.info('memory');
      
      return {
        connected: this.isConnected,
        info: info
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        connected: this.isConnected,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService; 