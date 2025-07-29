const fabricDAO = require('../dao/FabricDAO');
const oracleClient = require('../clients/OracleClient');
const { errorCodes } = require('../../config');

/**
 * 大米批次服务层
 * 处理与大米批次相关的所有业务逻辑
 */
class RiceService {

  /**
   * 获取所有大米批次
   * @param {string} role - 调用者角色
   * @returns {Promise<Array>} 批次列表
   */
  async getAllBatches(role) {
    try {
      return await fabricDAO.evaluateTransaction(role, 'GetAllRiceBatches');
    } catch (error) {
      throw new Error(`获取批次列表失败: ${error.message}`);
    }
  }

  /**
   * 根据ID获取大米批次
   * @param {string} role - 调用者角色
   * @param {string} batchId - 批次ID
   * @returns {Promise<Object>} 批次信息
   */
  async getBatchById(role, batchId) {
    if (!batchId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 批次ID不能为空`);
    }

    try {
      return await fabricDAO.evaluateTransaction(role, 'ReadRiceBatch', batchId);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new Error(`${errorCodes.NOT_FOUND}: 批次 ${batchId} 不存在`);
      }
      throw new Error(`获取批次详情失败: ${error.message}`);
    }
  }

  /**
   * 检查批次是否存在
   * @param {string} role - 调用者角色
   * @param {string} batchId - 批次ID
   * @returns {Promise<boolean>} 是否存在
   */
  async batchExists(role, batchId) {
    if (!batchId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 批次ID不能为空`);
    }

    try {
      const result = await fabricDAO.evaluateTransaction(role, 'RiceBatchExists', batchId);
      return result === true || result === 'true';
    } catch (error) {
      throw new Error(`检查批次存在性失败: ${error.message}`);
    }
  }

  /**
   * 创建新的大米批次
   * @param {string} role - 调用者角色
   * @param {Object} batchData - 批次数据
   * @returns {Promise<string>} 新创建的批次ID
   */
  async createBatch(role, batchData) {
    // 数据验证
    this._validateBatchData(batchData);
    
    const { location, variety, harvestDate, initialTestResult, owner, initialStep, operator } = batchData;
    
    try {
      // 生成批次ID
      const batchId = this._generateBatchId();
      
      // 调用智能合约创建批次
      await fabricDAO.submitTransaction(
        role,
        'CreateRiceBatch',
        batchId,
        location,
        variety,
        harvestDate,
        JSON.stringify(initialTestResult),
        owner,
        initialStep,
        operator
      );

      return batchId;
    } catch (error) {
      throw new Error(`创建批次失败: ${error.message}`);
    }
  }

  /**
   * 转移批次所有权
   * @param {string} role - 调用者角色
   * @param {string} batchId - 批次ID
   * @param {Object} transferData - 转移数据
   * @returns {Promise<Object>} 转移结果
   */
  async transferBatch(role, batchId, transferData) {
    if (!batchId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 批次ID不能为空`);
    }

    const { newOwner, operator } = transferData;
    if (!newOwner || !operator) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 新所有者和操作员信息不能为空`);
    }

    try {
      // 先检查批次是否存在
      const exists = await this.batchExists(role, batchId);
      if (!exists) {
        throw new Error(`${errorCodes.NOT_FOUND}: 批次 ${batchId} 不存在`);
      }

      // 执行转移
      await fabricDAO.submitTransaction(role, 'TransferRiceBatch', batchId, newOwner, operator);
      
      // 返回更新后的批次信息
      const updatedBatch = await this.getBatchById(role, batchId);
      
      return {
        message: `批次所有权已转移至 ${updatedBatch.currentOwner}`,
        newOwner: updatedBatch.currentOwner,
        batchId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`转移批次失败: ${error.message}`);
    }
  }

  /**
   * 添加质检结果 (支持Oracle验证)
   * @param {string} role - 调用者角色
   * @param {string} batchId - 批次ID
   * @param {Object} testData - 质检数据 (可包含externalReportId)
   * @returns {Promise<Object>} 操作结果
   */
  async addTestResult(role, batchId, testData) {
    if (!batchId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 批次ID不能为空`);
    }

    try {
      // 检查批次是否存在
      const exists = await this.batchExists(role, batchId);
      if (!exists) {
        throw new Error(`${errorCodes.NOT_FOUND}: 批次 ${batchId} 不存在`);
      }

      let finalTestResult;

      // 判断是否使用Oracle验证
      if (testData.externalReportId) {
        // 使用Oracle验证外部报告
        console.log(`正在验证外部报告: ${testData.externalReportId}`);
        const verificationResult = await oracleClient.verifyTestReport(testData.externalReportId);
        
        // 使用Oracle验证后的数据
        finalTestResult = {
          ...verificationResult.data,
          timestamp: verificationResult.verifiedAt
        };

        console.log(`✅ Oracle验证成功: ${testData.externalReportId}`);
      } else {
        // 传统方式：验证用户提供的质检数据
        this._validateTestData(testData);
        
        finalTestResult = {
          ...testData,
          timestamp: testData.timestamp || new Date().toISOString(),
          isVerified: false,
          verificationSource: null
        };
      }

      // 提交到区块链
      await fabricDAO.submitTransaction(role, 'AddTestResult', batchId, JSON.stringify(finalTestResult));
      
      return {
        message: finalTestResult.isVerified ? 
          '质检结果已添加 (Oracle验证)' : 
          '质检结果已添加 (手动输入)',
        batchId,
        testId: finalTestResult.testId,
        isVerified: finalTestResult.isVerified,
        verificationSource: finalTestResult.verificationSource
      };
    } catch (error) {
      throw new Error(`添加质检结果失败: ${error.message}`);
    }
  }

  /**
   * 添加加工记录
   * @param {string} role - 调用者角色
   * @param {string} batchId - 批次ID
   * @param {Object} processData - 加工数据
   * @returns {Promise<Object>} 操作结果
   */
  async addProcessingRecord(role, batchId, processData) {
    if (!batchId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 批次ID不能为空`);
    }

    const { step, operator } = processData;
    if (!step || !operator) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 加工步骤和操作员信息不能为空`);
    }

    try {
      // 检查批次是否存在
      const exists = await this.batchExists(role, batchId);
      if (!exists) {
        throw new Error(`${errorCodes.NOT_FOUND}: 批次 ${batchId} 不存在`);
      }

      await fabricDAO.submitTransaction(role, 'AddProcessingRecord', batchId, step, operator);
      
      return {
        message: '加工记录已添加',
        batchId,
        step,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`添加加工记录失败: ${error.message}`);
    }
  }

  /**
   * 验证批次数据
   * @private
   */
  _validateBatchData(batchData) {
    const required = ['location', 'variety', 'harvestDate', 'initialTestResult', 'owner', 'initialStep', 'operator'];
    const missing = required.filter(field => !batchData[field]);
    
    if (missing.length > 0) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 缺少必填字段: ${missing.join(', ')}`);
    }

    // 验证日期格式
    if (!this._isValidDate(batchData.harvestDate)) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 收获日期格式无效`);
    }
  }

  /**
   * 验证质检数据
   * @private
   */
  _validateTestData(testData) {
    const required = ['testId', 'testerId', 'result'];
    const missing = required.filter(field => !testData[field]);
    
    if (missing.length > 0) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 缺少必填字段: ${missing.join(', ')}`);
    }
  }

  /**
   * 生成批次ID
   * @private
   */
  _generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取Oracle服务状态
   * @returns {Object} Oracle服务状态
   */
  async getOracleStatus() {
    try {
      return oracleClient.getServiceStatus();
    } catch (error) {
      throw new Error(`获取Oracle状态失败: ${error.message}`);
    }
  }

  /**
   * 验证日期格式
   * @private
   */
  _isValidDate(dateString) {
    return !isNaN(Date.parse(dateString));
  }
}

module.exports = new RiceService(); 