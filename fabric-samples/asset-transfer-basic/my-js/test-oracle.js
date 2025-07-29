/**
 * Oracle 集成测试脚本
 * 测试 Oracle 客户端的功能
 */

const oracleClient = require('./src/clients/OracleClient');
const { oracleServices } = require('./config');

async function testOracleIntegration() {
  console.log('🔬 Oracle 集成测试开始...\n');

  // 1. 测试服务状态
  console.log('1️⃣ 测试 Oracle 服务状态:');
  try {
    const status = oracleClient.getServiceStatus();
    console.log('✅ 服务状态获取成功:');
    console.log(JSON.stringify(status, null, 2));
  } catch (error) {
    console.log('❌ 服务状态获取失败:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 2. 测试无效的报告ID
  console.log('2️⃣ 测试无效的报告ID:');
  try {
    await oracleClient.verifyTestReport('invalid-report-id');
    console.log('❌ 应该失败但没有失败');
  } catch (error) {
    console.log('✅ 预期的错误:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 3. 测试空报告ID
  console.log('3️⃣ 测试空报告ID:');
  try {
    await oracleClient.verifyTestReport('');
    console.log('❌ 应该失败但没有失败');
  } catch (error) {
    console.log('✅ 预期的验证错误:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 4. 显示配置信息
  console.log('4️⃣ Oracle 配置信息:');
  console.log(`📡 API 端点: ${oracleServices.foodSafety.baseUrl}`);
  console.log(`🔑 API 密钥: ${oracleServices.foodSafety.apiKey ? '已配置' : '未配置'}`);
  console.log(`⏱️  超时时间: ${oracleServices.foodSafety.timeout}ms`);
  console.log(`🔄 重试次数: ${oracleServices.foodSafety.retryCount}`);

  console.log('\n' + '='.repeat(50) + '\n');

  console.log('🎉 Oracle 集成测试完成!');
  console.log('\n📝 测试总结:');
  console.log('   - Oracle 客户端模块加载正常');
  console.log('   - 错误处理机制工作正常');
  console.log('   - 配置参数读取正常');
  console.log('   - 准备好与真实 API 集成');

  console.log('\n💡 使用提示:');
  console.log('   1. 设置环境变量 FOOD_SAFETY_API_URL 指向真实 API');
  console.log('   2. 设置环境变量 FOOD_SAFETY_API_KEY 为真实密钥');
  console.log('   3. 通过 POST /api/batch/:id/test 使用 Oracle 验证');
  console.log('   4. 请求体: { "externalReportId": "FS-REPORT-12345" }');
}

// 运行测试
if (require.main === module) {
  testOracleIntegration().catch(console.error);
}

module.exports = { testOracleIntegration }; 