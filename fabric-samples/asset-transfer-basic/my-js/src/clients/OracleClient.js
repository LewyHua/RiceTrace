const { oracleServices, errorCodes } = require('../../config');
const reportService = require('../services/ReportService');

/**
 * Oracle Client
 * Responsible for interacting with external data sources, verifying and obtaining trusted data
 */
class OracleClient {

  /**
   * Verify test report (using internal ReportService)
   * @param {string} reportId - Report ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyTestReport(reportId) {
    if (!reportId || typeof reportId !== 'string') {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: Report ID is required`);
    }

    try {
      console.log(`Oracle start to verify report: ${reportId}`);

      // Use internal ReportService to verify report
      const verificationResult = await reportService.verifyReport(reportId);
      
      if (!verificationResult.success) {
        throw new Error(`${errorCodes.ORACLE_VERIFICATION_FAILED}: ${verificationResult.error}`);
      }

      const reportData = verificationResult.data;
      
      // Standardize data format to be compatible with existing logic
      const standardizedData = {
        testId: reportData.reportId,
        result: 'PASSED', // Reports that pass verification are considered PASSED
        tester: reportData.uploadedBy,
        testDate: reportData.createdAt,
        laboratory: 'Internal QC System',
        certificationNumber: reportData.reportId,
        notes: `File hash: ${reportData.fileHash}`,
        
        // Oracle-specific fields
        isVerified: true,
        verificationSource: 'RiceTrace-ReportService',
        externalReportId: reportData.reportId,
        fileHash: reportData.fileHash,
        fileUrl: reportData.fileUrl
      };

      console.log(`Oracle verification successful: ${reportId}`);

      return {
        success: true,
        data: standardizedData,
        source: 'RiceTrace-ReportService',
        verifiedAt: new Date().toISOString(),
        externalReportId: reportId
      };

    } catch (error) {
      console.error(`Oracle verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify test report data format
   * @param {Object} data - Original data returned by API
   * @returns {Object} Standardized test data
   * @private
   */
  _validateTestReportData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error(`${errorCodes.ORACLE_ERROR}: Invalid API response format`);
    }

    // Required field check
    const requiredFields = ['reportId', 'testResult', 'tester', 'testDate'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`${errorCodes.ORACLE_ERROR}: API response missing required field: ${field}`);
      }
    }

    // Standardize data format
    return {
      testId: data.reportId,
      result: data.testResult.toUpperCase(), // Standardize to uppercase
      tester: data.tester,
      testDate: this._validateAndFormatDate(data.testDate),
      laboratory: data.laboratory || 'Unknown',
      certificationNumber: data.certificationNumber || '',
      notes: data.notes || '',
      
      // Oracle-specific fields
      isVerified: true,
      verificationSource: 'NationalFoodSafetyAPI',
      externalReportId: data.reportId
    };
  }

  /**
   * Verify and format date
   * @param {string} dateString - Date string
   * @returns {string} ISO format date
   * @private
   */
  _validateAndFormatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`${errorCodes.ORACLE_ERROR}: Invalid date format: ${dateString}`);
    }
    return date.toISOString();
  }

  /**
   * Asynchronous wait
   * @param {number} ms - Wait milliseconds
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get Oracle service status
   * @returns {Object} Service status information
   */
  getServiceStatus() {
    return {
      foodSafety: {
        endpoint: oracleServices.foodSafety.baseUrl,
        configured: !!oracleServices.foodSafety.apiKey,
        timeout: oracleServices.foodSafety.timeout
      }
    };
  }
}

// Export singleton instance
const oracleClient = new OracleClient();
module.exports = oracleClient; 