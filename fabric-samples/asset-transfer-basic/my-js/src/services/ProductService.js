const fabricDAO = require('../dao/FabricDAO');
const { errorCodes } = require('../../config');

/**
 * Product service layer
 * Handles all business logic related to products
 */
class ProductService {

  /**
   * Create product
   * @param {string} role - Caller role
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} Creation result
   */
  async createProduct(role, productData) {
    // Validate product data
    this._validateProductData(productData);
    
    const { productId, batchId, packageDate, owner } = productData;
    
    try {
      // Check if batch exists
      const batchExists = await fabricDAO.evaluateTransaction(role, 'RiceBatchExists', batchId);
      if (!(batchExists === true || batchExists === 'true')) {
        throw new Error(`${errorCodes.NOT_FOUND}: Associated batch ${batchId} does not exist`);
      }

      // Create product
      await fabricDAO.submitTransaction(role, 'CreateProduct', productId, batchId, packageDate, owner);
      
      return {
        message: 'Product created successfully',
        productId,
        batchId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  /**
   * Get product and batch information by ID
   * @param {string} role - Caller role
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Product and batch information
   */
  async getProductById(role, productId) {
    if (!productId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Product ID cannot be empty`);
    }

    try {
      return await fabricDAO.evaluateTransaction(role, 'ReadProduct', productId);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new Error(`${errorCodes.NOT_FOUND}: Product ${productId} does not exist`);
      }
      throw new Error(`Failed to get product information: ${error.message}`);
    }
  }

  /**
   * Check if product exists
   * @param {string} role - Caller role
   * @param {string} productId - Product ID
   * @returns {Promise<boolean>} Whether it exists
   */
  async productExists(role, productId) {
    if (!productId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Product ID cannot be empty`);
    }

    try {
      await this.getProductById(role, productId);
      return true;
    } catch (error) {
      if (error.message.includes(errorCodes.NOT_FOUND)) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get full traceability information of product
   * @param {string} role - Caller role
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Full traceability information
   */
  async getProductTraceability(role, productId) {
    try {
      // Get product information (already contains batch information)
      const productInfo = await this.getProductById(role, productId);
      
      // Add traceability summary
      const traceability = {
        ...productInfo,
        traceabilityInfo: {
          totalSteps: this._calculateTotalSteps(productInfo),
          lastUpdated: this._getLastUpdateTime(productInfo),
          verificationStatus: this._getVerificationStatus(productInfo)
        }
      };

      return traceability;
    } catch (error) {
      throw new Error(`Failed to get product traceability information: ${error.message}`);
    }
  }

  /**
   * Validate product data
   * @private
   */
  _validateProductData(productData) {
    const required = ['productId', 'batchId', 'packageDate', 'owner'];
    const missing = required.filter(field => !productData[field]);
    
    if (missing.length > 0) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Missing required fields: ${missing.join(', ')}`);
    }

    // Validate package date format
    if (!this._isValidDate(productData.packageDate)) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Invalid package date format`);
    }

    // Validate product ID format (simple format check)
    if (!/^[a-zA-Z0-9_-]+$/.test(productData.productId)) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Invalid product ID format, only letters, numbers, underscores and hyphens are allowed`);
    }
  }

  /**
   * Calculate total steps
   * @private
   */
  _calculateTotalSteps(productInfo) {
    if (!productInfo.batch) return 0;
    
    const { ownerHistory = [], processHistory = [], testResults = [] } = productInfo.batch;
    return ownerHistory.length + processHistory.length + testResults.length;
  }

  /**
   * Get last update time
   * @private
   */
  _getLastUpdateTime(productInfo) {
    if (!productInfo.batch) return null;
    
    const times = [];
    
    // Collect all timestamps
    if (productInfo.batch.ownerHistory) {
      times.push(...productInfo.batch.ownerHistory.map(h => h.timestamp));
    }
    if (productInfo.batch.processHistory) {
      times.push(...productInfo.batch.processHistory.map(h => h.timestamp));
    }
    if (productInfo.batch.testResults) {
      times.push(...productInfo.batch.testResults.map(h => h.timestamp));
    }
    if (productInfo.product.packageDate) {
      times.push(productInfo.product.packageDate);
    }

    // Return latest time
    return times.length > 0 ? new Date(Math.max(...times.map(t => new Date(t)))).toISOString() : null;
  }

  /**
   * Get verification status
   * @private
   */
  _getVerificationStatus(productInfo) {
    if (!productInfo.batch || !productInfo.batch.testResults || productInfo.batch.testResults.length === 0) {
      return 'PENDING'; // Pending verification
    }

    // Check latest test result
    const latestTest = productInfo.batch.testResults[productInfo.batch.testResults.length - 1];
    return latestTest.result === 'Passed' ? 'VERIFIED' : 'FAILED';
  }

  /**
   * Validate date format
   * @private
   */
  _isValidDate(dateString) {
    return !isNaN(Date.parse(dateString));
  }
}

module.exports = new ProductService(); 