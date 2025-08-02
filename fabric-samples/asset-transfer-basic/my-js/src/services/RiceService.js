const fabricDAO = require('../dao/FabricDAO');
const oracleClient = require('../clients/OracleClient');
const cacheService = require('./CacheService');
const { errorCodes } = require('../../config');

/**
 * Rice batch service layer
 * Handles all business logic related to rice batches
 */
class RiceService {

  /**
   * Get all rice batches
   * @param {string} role - Caller role
   * @returns {Promise<Array>} Batch list
   */
  async getAllBatches(role) {
    try {
      // Try to get from cache first
      const cachedBatches = await cacheService.getBatchList(role);
      if (cachedBatches !== null) {
        return cachedBatches;
      }

      // If not in cache, get from blockchain
      const batches = await fabricDAO.evaluateTransaction(role, 'GetAllRiceBatches');
      
      // Cache the result
      await cacheService.setBatchList(role, batches);
      
      return batches;
    } catch (error) {
      throw new Error(`Failed to get batch list: ${error.message}`);
    }
  }

  /**
   * Get rice batch by ID
   * @param {string} role - Caller role
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object>} Batch information
   */
  async getBatchById(role, batchId) {
    if (!batchId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Batch ID cannot be empty`);
    }

    try {
      // Try to get from cache first
      const cachedBatch = await cacheService.getBatchDetail(batchId);
      if (cachedBatch !== null) {
        return cachedBatch;
      }

      // If not in cache, get from blockchain
      const batch = await fabricDAO.evaluateTransaction(role, 'ReadRiceBatch', batchId);
      
      // Cache the result
      await cacheService.setBatchDetail(batchId, batch);
      
      return batch;
    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw new Error(`${errorCodes.NOT_FOUND}: Batch ${batchId} does not exist`);
      }
      throw new Error(`Failed to get batch details: ${error.message}`);
    }
  }

  /**
   * Check if batch exists
   * @param {string} role - Caller role
   * @param {string} batchId - Batch ID
   * @returns {Promise<boolean>} Whether it exists
   */
  async batchExists(role, batchId) {
    if (!batchId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Batch ID cannot be empty`);
    }

    try {
      // Try to get from cache first
      const cachedExists = await cacheService.getBatchExists(batchId);
      if (cachedExists !== null) {
        return cachedExists;
      }

      // If not in cache, check from blockchain
      const result = await fabricDAO.evaluateTransaction(role, 'RiceBatchExists', batchId);
      const exists = result === true || result === 'true';
      
      // Cache the result
      await cacheService.setBatchExists(batchId, exists);
      
      return exists;
    } catch (error) {
      throw new Error(`Failed to check batch existence: ${error.message}`);
    }
  }

  /**
   * Create new rice batch (requires quality inspection report)
   * @param {string} role - Caller role
   * @param {Object} batchData - Batch data
   * @param {string} reportId - Quality inspection report ID
   * @returns {Promise<Object>} Newly created batch information
   */
  async createBatch(role, batchData, reportId) {
    // Data validation
    this._validateBatchData(batchData);

    if (!reportId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Creating batch requires quality inspection report ID`);
    }
    
    const { location, variety, harvestDate, initialTestResult, owner, initialStep, operator } = batchData;
    
    try {
      // Verify quality inspection report
      console.log(`Verify quality inspection report for creating batch: ${reportId}`);
      const verificationResult = await oracleClient.verifyTestReport(reportId);
      
      if (!verificationResult.success) {
        throw new Error(`Quality inspection report verification failed: ${verificationResult.error}`);
      }

      const reportData = verificationResult.data;
      console.log(`Quality inspection report verification passed: ${reportId}`);

      // Generate batch ID
      const batchId = this._generateBatchId();
      
      // Call smart contract to create batch, pass in report hash
      await fabricDAO.submitTransaction(
        role,
        'CreateRiceBatch',
        batchId,
        location,
        variety,
        harvestDate,
        JSON.stringify({
          // Use Oracle verified data, ignore placeholder data from frontend
          testId: reportData.testId,
          testerId: reportData.tester,
          timestamp: reportData.testDate,
          temperature: reportData.laboratory || "N/A",
          report: reportData.notes || "Oracle verified quality report",
          result: reportData.result,
          // Oracle verification information
          reportId: reportId,
          reportHash: reportData.fileHash,
          isVerified: true,
          verificationSource: reportData.verificationSource
        }),
        owner,
        initialStep,
        operator
      );

      // Invalidate cache after creating new batch
      await cacheService.invalidateBatchList();

      return {
        batchId,
        reportId,
        reportHash: reportData.fileHash,
        message: 'Rice batch created successfully (associated with quality inspection report)'
      };
    } catch (error) {
      throw new Error(`Failed to create batch: ${error.message}`);
    }
  }

  /**
   * Transfer batch ownership (requires quality inspection report)
   * @param {string} role - Caller role
   * @param {string} batchId - Batch ID
   * @param {Object} transferData - Transfer data
   * @param {string} reportId - Quality inspection report ID
   * @returns {Promise<Object>} Transfer result
   */
  async transferBatch(role, batchId, transferData, reportId) {
    if (!batchId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Batch ID cannot be empty`);
    }

    if (!reportId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Transferring batch requires quality inspection report ID`);
    }

    const { newOwner, operator } = transferData;
    if (!newOwner || !operator) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: New owner and operator information cannot be empty`);
    }

    try {
      // Check if batch exists
      const exists = await this.batchExists(role, batchId);
      if (!exists) {
        throw new Error(`${errorCodes.NOT_FOUND}: Batch ${batchId} does not exist`);
      }

      // Verify quality inspection report
      console.log(`Verify quality inspection report for transferring batch: ${reportId}`);
      const verificationResult = await oracleClient.verifyTestReport(reportId);
      
      if (!verificationResult.success) {
        throw new Error(`Quality inspection report verification failed: ${verificationResult.error}`);
      }

      const reportData = verificationResult.data;
      console.log(`Quality inspection report verification passed: ${reportId}`);

      // Execute transfer (smart contract only needs basic parameters, report information recorded in the middle)
      await fabricDAO.submitTransaction(
        role, 
        'TransferRiceBatch', 
        batchId, 
        newOwner, 
        operator
      );
      
      // Invalidate cache after transferring batch
      await cacheService.invalidateBatchCache(batchId);
      
      // Return updated batch information
      const updatedBatch = await this.getBatchById(role, batchId);
      
      return {
        message: `Batch ownership transferred to ${updatedBatch.currentOwner} (associated with quality inspection report)`,
        newOwner: updatedBatch.currentOwner,
        batchId,
        reportId,
        reportHash: reportData.fileHash,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to transfer batch: ${error.message}`);
    }
  }

  /**
   * Add test result (supports Oracle verification)
   * @param {string} role - Caller role
   * @param {string} batchId - Batch ID
   * @param {Object} testData - Test data (can contain externalReportId)
   * @returns {Promise<Object>} Operation result
   */
  async addTestResult(role, batchId, testData) {
    if (!batchId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Batch ID cannot be empty`);
    }

    try {
      // Check if batch exists
      const exists = await this.batchExists(role, batchId);
      if (!exists) {
        throw new Error(`${errorCodes.NOT_FOUND}: Batch ${batchId} does not exist`);
      }

      let finalTestResult;

      // Check if using Oracle verification
      if (testData.externalReportId) {
        // Use Oracle to verify external report
        console.log(`Verifying external report: ${testData.externalReportId}`);
        const verificationResult = await oracleClient.verifyTestReport(testData.externalReportId);
        
        // Use Oracle verified data
        finalTestResult = {
          ...verificationResult.data,
          timestamp: verificationResult.verifiedAt
        };

        console.log(`Oracle verification passed: ${testData.externalReportId}`);
      } else {
        // Traditional way: verify user provided test data
        this._validateTestData(testData);
        
        finalTestResult = {
          ...testData,
          timestamp: testData.timestamp || new Date().toISOString(),
          isVerified: false,
          verificationSource: null
        };
      }

      // Submit to blockchain
      await fabricDAO.submitTransaction(role, 'AddTestResult', batchId, JSON.stringify(finalTestResult));
      
      // Invalidate cache after adding test result
      await cacheService.invalidateBatchCache(batchId);
      
      return {
        message: finalTestResult.isVerified ? 
          'Test result added (Oracle verification)' : 
          'Test result added (manual input)',
        batchId,
        testId: finalTestResult.testId,
        isVerified: finalTestResult.isVerified,
        verificationSource: finalTestResult.verificationSource
      };
    } catch (error) {
      throw new Error(`Failed to add test result: ${error.message}`);
    }
  }

  /**
   * Add processing record
   * @param {string} role - Caller role
   * @param {string} batchId - Batch ID
   * @param {Object} processData - Processing data
   * @returns {Promise<Object>} Operation result
   */
  async addProcessingRecord(role, batchId, processData) {
    if (!batchId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Batch ID cannot be empty`);
    }

    const { step, operator } = processData;
    if (!step || !operator) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Processing step and operator information cannot be empty`);
    }

    try {
      // Check if batch exists
      const exists = await this.batchExists(role, batchId);
      if (!exists) {
        throw new Error(`${errorCodes.NOT_FOUND}: Batch ${batchId} does not exist`);
      }

      await fabricDAO.submitTransaction(role, 'AddProcessingRecord', batchId, step, operator);
      
      // Invalidate cache after adding processing record
      await cacheService.invalidateBatchCache(batchId);
      
      return {
        message: 'Processing record added',
        batchId,
        step,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to add processing record: ${error.message}`);
    }
  }

  /**
   * Validate batch data
   * @private
   */
  _validateBatchData(batchData) {
    const required = ['location', 'variety', 'harvestDate', 'initialTestResult', 'owner', 'initialStep', 'operator'];
    const missing = required.filter(field => !batchData[field]);
    
    if (missing.length > 0) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Missing required fields: ${missing.join(', ')}`);
    }

    // 验证日期格式
    if (!this._isValidDate(batchData.harvestDate)) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Invalid harvest date format`);
    }
  }

  /**
   * Validate test data
   * @private
   */
  _validateTestData(testData) {
    const required = ['testId', 'testerId', 'result'];
    const missing = required.filter(field => !testData[field]);
    
    if (missing.length > 0) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Generate batch ID
   * @private
   */
  _generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get Oracle service status
   * @returns {Object} Oracle service status
   */
  async getOracleStatus() {
    try {
      return oracleClient.getServiceStatus();
    } catch (error) {
      throw new Error(`Failed to get Oracle status: ${error.message}`);
    }
  }

  /**
   * Complete step and transfer batch - unified method
   * @param {string} role - Caller role
   * @param {string} batchId - Batch ID
   * @param {string} fromOperator - Current operator
   * @param {string} toOperator - Next operator
   * @param {string} step - Current step
   * @param {string} reportId - Report ID for verification
   * @returns {Promise<Object>} Transaction result
   */
  async completeStepAndTransfer(role, batchId, fromOperator, toOperator, step, reportId) {
    // Validate inputs
    if (!batchId || !fromOperator || !toOperator || !step || !reportId) {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: All fields are required`);
    }

    try {
      // First, verify the report and get ReportDetail
      const reportService = require('./ReportService');
      const reportDetail = await reportService.verifyAndFetchReportDetail(reportId);
      
      console.log(`Processing step and transfer: ${step} from ${fromOperator} to ${toOperator}`);
      
      // Call the new smart contract method
      const result = await fabricDAO.submitTransaction(
        role,
        'CompleteStepAndTransfer',
        batchId,
        fromOperator,
        toOperator,
        step,
        JSON.stringify(reportDetail)
      );

      // Invalidate cache after completing step and transfer
      await cacheService.invalidateBatchCache(batchId);

      console.log(`Step completed and batch transferred successfully`);
      return result;

    } catch (error) {
      console.error('Failed to complete step and transfer:', error.message);
      // Re-throw the original error to preserve specific error messages
      throw error;
    }
  }

  /**
   * Get current batch owner for auto-fill
   * @param {string} role - Caller role  
   * @param {string} batchId - Batch ID
   * @returns {Promise<string>} Current owner
   */
  async getCurrentBatchOwner(role, batchId) {
    try {
      const batch = await this.getBatchById(role, batchId);
      return batch.currentOwner;
    } catch (error) {
      throw new Error(`Failed to get current batch owner: ${error.message}`);
    }
  }

  /**
   * Validate date format
   * @private
   */
  _isValidDate(dateString) {
    return !isNaN(Date.parse(dateString));
  }
}

module.exports = new RiceService(); 