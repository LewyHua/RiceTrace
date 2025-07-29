const { oracleServices, errorCodes } = require('../../config');

/**
 * Oracle 客户端
 * 负责与外部数据源进行交互，验证和获取可信数据
 */
class OracleClient {

  /**
   * 验证食品安全质检报告
   * @param {string} externalReportId - 外部系统的报告ID
   * @returns {Promise<Object>} 验证结果
   */
  async verifyTestReport(externalReportId) {
    if (!externalReportId || typeof externalReportId !== 'string') {
      throw new Error(`${errorCodes.VALIDATION_ERROR}: 外部报告ID不能为空`);
    }

    const { baseUrl, apiKey, timeout, retryCount } = oracleServices.foodSafety;
    const url = `${baseUrl}/reports/${externalReportId}`;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'RiceTrace-Oracle/1.0'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`${errorCodes.ORACLE_VERIFICATION_FAILED}: 报告ID ${externalReportId} 不存在`);
          }
          if (response.status === 401 || response.status === 403) {
            throw new Error(`${errorCodes.ORACLE_ERROR}: API认证失败`);
          }
          throw new Error(`${errorCodes.ORACLE_ERROR}: API请求失败 (状态码: ${response.status})`);
        }

        const data = await response.json();
        
        // 验证返回数据格式
        const validatedData = this._validateTestReportData(data);
        
        return {
          success: true,
          data: validatedData,
          source: 'NationalFoodSafetyAPI',
          verifiedAt: new Date().toISOString(),
          externalReportId
        };

      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn(`Oracle API timeout (attempt ${attempt}/${retryCount}): ${url}`);
        } else if (error.message.includes(errorCodes.ORACLE_VERIFICATION_FAILED)) {
          // 验证失败不重试
          throw error;
        } else {
          console.warn(`Oracle API error (attempt ${attempt}/${retryCount}): ${error.message}`);
        }

        if (attempt === retryCount) {
          throw new Error(`${errorCodes.ORACLE_ERROR}: 外部API调用失败，已重试${retryCount}次: ${error.message}`);
        }

        // 等待后重试
        await this._sleep(1000 * attempt);
      }
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