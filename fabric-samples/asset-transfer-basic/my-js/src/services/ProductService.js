const fabricDAO = require('../dao/FabricDAO');
const { errorCodes } = require('../../config');

/**
 * 产品服务层
 * 处理与产品相关的所有业务逻辑
 */
class ProductService {

  /**
   * 创建产品
   * @param {string} role - 调用者角色
   * @param {Object} productData - 产品数据
   * @returns {Promise<Object>} 创建结果
   */
  async createProduct(role, productData) {
    // 验证产品数据
    this._validateProductData(productData);
    
    const { productId, batchId, packageDate, owner } = productData;
    
    try {
      // 先检查批次是否存在
      const batchExists = await fabricDAO.evaluateTransaction(role, 'RiceBatchExists', batchId);
      if (!(batchExists === true || batchExists === 'true')) {
        throw new Error(`${errorCodes.NOT_FOUND}: 关联的批次 ${batchId} 不存在`);
      }

      // 创建产品
      await fabricDAO.submitTransaction(role, 'CreateProduct', productId, batchId, packageDate, owner);
      
      return {
        message: '产品创建成功',
        productId,
        batchId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`创建产品失败: ${error.message}`);
    }
  }

  /**
   * 根据ID获取产品及其批次信息
   * @param {string} role - 调用者角色
   * @param {string} productId - 产品ID
   * @returns {Promise<Object>} 产品和批次信息
   */
  async getProductById(role, productId) {
    if (!productId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 产品ID不能为空`);
    }

    try {
      return await fabricDAO.evaluateTransaction(role, 'ReadProduct', productId);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new Error(`${errorCodes.NOT_FOUND}: 产品 ${productId} 不存在`);
      }
      throw new Error(`获取产品信息失败: ${error.message}`);
    }
  }

  /**
   * 检查产品是否存在
   * @param {string} role - 调用者角色
   * @param {string} productId - 产品ID
   * @returns {Promise<boolean>} 是否存在
   */
  async productExists(role, productId) {
    if (!productId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 产品ID不能为空`);
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
   * 获取产品的完整追溯信息
   * @param {string} role - 调用者角色
   * @param {string} productId - 产品ID
   * @returns {Promise<Object>} 完整的追溯信息
   */
  async getProductTraceability(role, productId) {
    try {
      // 获取产品信息（已包含批次信息）
      const productInfo = await this.getProductById(role, productId);
      
      // 添加追溯摘要
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
      throw new Error(`获取产品追溯信息失败: ${error.message}`);
    }
  }

  /**
   * 验证产品数据
   * @private
   */
  _validateProductData(productData) {
    const required = ['productId', 'batchId', 'packageDate', 'owner'];
    const missing = required.filter(field => !productData[field]);
    
    if (missing.length > 0) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 缺少必填字段: ${missing.join(', ')}`);
    }

    // 验证包装日期格式
    if (!this._isValidDate(productData.packageDate)) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 包装日期格式无效`);
    }

    // 验证产品ID格式（简单格式检查）
    if (!/^[a-zA-Z0-9_-]+$/.test(productData.productId)) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 产品ID格式无效，只能包含字母、数字、下划线和横线`);
    }
  }

  /**
   * 计算总步骤数
   * @private
   */
  _calculateTotalSteps(productInfo) {
    if (!productInfo.batch) return 0;
    
    const { ownerHistory = [], processHistory = [], testResults = [] } = productInfo.batch;
    return ownerHistory.length + processHistory.length + testResults.length;
  }

  /**
   * 获取最后更新时间
   * @private
   */
  _getLastUpdateTime(productInfo) {
    if (!productInfo.batch) return null;
    
    const times = [];
    
    // 收集所有时间戳
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

    // 返回最新时间
    return times.length > 0 ? new Date(Math.max(...times.map(t => new Date(t)))).toISOString() : null;
  }

  /**
   * 获取验证状态
   * @private
   */
  _getVerificationStatus(productInfo) {
    if (!productInfo.batch || !productInfo.batch.testResults || productInfo.batch.testResults.length === 0) {
      return 'PENDING'; // 待验证
    }

    // 检查最近的测试结果
    const latestTest = productInfo.batch.testResults[productInfo.batch.testResults.length - 1];
    return latestTest.result === 'Passed' ? 'VERIFIED' : 'FAILED';
  }

  /**
   * 验证日期格式
   * @private
   */
  _isValidDate(dateString) {
    return !isNaN(Date.parse(dateString));
  }
}

module.exports = new ProductService(); 