const { oracleServices, errorCodes } = require('../../config');
const reportService = require('../services/ReportService');

/**
 * Oracle 客户端
 * 负责与外部数据源进行交互，验证和获取可信数据
 */
class OracleClient {

  /**
   * 验证质检报告 (通过内部ReportService)
   * @param {string} reportId - 报告ID
   * @returns {Promise<Object>} 验证结果
   */
  async verifyTestReport(reportId) {
    if (!reportId || typeof reportId !== 'string') {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 报告ID不能为空`);
    }

    try {
      console.log(`🔍 Oracle开始验证报告: ${reportId}`);

      // 使用内部ReportService验证报告
      const verificationResult = await reportService.verifyReport(reportId);
      
      if (!verificationResult.success) {
        throw new Error(`${errorCodes.ORACLE_VERIFICATION_FAILED}: ${verificationResult.error}`);
      }

      const reportData = verificationResult.data;
      
      // 标准化数据格式以兼容原有逻辑
      const standardizedData = {
        testId: reportData.reportId,
        result: 'PASSED', // 能通过验证的报告都视为PASSED
        tester: reportData.uploadedBy,
        testDate: reportData.createdAt,
        laboratory: 'Internal QC System',
        certificationNumber: reportData.reportId,
        notes: `文件哈希: ${reportData.fileHash}`,
        
        // Oracle特有字段
        isVerified: true,
        verificationSource: 'RiceTrace-ReportService',
        externalReportId: reportData.reportId,
        fileHash: reportData.fileHash,
        fileUrl: reportData.fileUrl
      };

      console.log(`✅ Oracle验证成功: ${reportId}`);

      return {
        success: true,
        data: standardizedData,
        source: 'RiceTrace-ReportService',
        verifiedAt: new Date().toISOString(),
        externalReportId: reportId
      };

    } catch (error) {
      console.error(`❌ Oracle验证失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证测试报告数据格式
   * @param {Object} data - API返回的原始数据
   * @returns {Object} 标准化的测试数据
   * @private
   */
  _validateTestReportData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error(`${errorCodes.ORACLE_ERROR}: 无效的API响应格式`);
    }

    // 必需字段检查
    const requiredFields = ['reportId', 'testResult', 'tester', 'testDate'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`${errorCodes.ORACLE_ERROR}: API响应缺少必需字段: ${field}`);
      }
    }

    // 标准化数据格式
    return {
      testId: data.reportId,
      result: data.testResult.toUpperCase(), // 标准化为大写
      tester: data.tester,
      testDate: this._validateAndFormatDate(data.testDate),
      laboratory: data.laboratory || 'Unknown',
      certificationNumber: data.certificationNumber || '',
      notes: data.notes || '',
      
      // Oracle特有字段
      isVerified: true,
      verificationSource: 'NationalFoodSafetyAPI',
      externalReportId: data.reportId
    };
  }

  /**
   * 验证并格式化日期
   * @param {string} dateString - 日期字符串
   * @returns {string} ISO格式日期
   * @private
   */
  _validateAndFormatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`${errorCodes.ORACLE_ERROR}: 无效的日期格式: ${dateString}`);
    }
    return date.toISOString();
  }

  /**
   * 异步等待
   * @param {number} ms - 等待毫秒数
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取Oracle服务状态
   * @returns {Object} 服务状态信息
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

// 导出单例实例
const oracleClient = new OracleClient();
module.exports = oracleClient; 