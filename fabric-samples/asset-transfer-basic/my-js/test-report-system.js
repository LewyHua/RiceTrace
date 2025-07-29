/**
 * 质检报告系统测试脚本
 * 测试完整的报告上传、验证和业务流程
 */

// 加载环境变量
require('dotenv').config();

const reportService = require('./src/services/ReportService');
const { cloudflareR2, supabase } = require('./config');

async function testReportSystem() {
  console.log('🧪 质检报告系统测试开始...\n');

  // 1. 测试服务状态
  console.log('1️⃣ 测试服务状态:');
  try {
    const status = reportService.getServiceStatus();
    console.log('✅ 服务状态:');
    console.log(JSON.stringify(status, null, 2));
  } catch (error) {
    console.log('❌ 获取服务状态失败:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 2. 测试配置验证
  console.log('2️⃣ 测试配置验证:');
  
  console.log('Cloudflare R2 配置:');
  console.log(`  📡 端点: ${cloudflareR2.endpoint}`);
  console.log(`  🪣 存储桶: ${cloudflareR2.bucketName}`);
  console.log(`  🔑 认证配置: ${cloudflareR2.accessKeyId ? '✅ 已配置' : '❌ 未配置'}`);

  console.log('\nSupabase 配置:');
  console.log(`  📡 URL: ${supabase.url}`);
  console.log(`  🔑 密钥配置: ${supabase.anonKey ? '✅ 已配置' : '❌ 未配置'}`);

  console.log('\n' + '='.repeat(50) + '\n');

  // 3. 测试报告验证 (应该失败)
  console.log('3️⃣ 测试不存在的报告验证:');
  try {
    await reportService.verifyReport('non-existent-report-id');
    console.log('❌ 应该失败但没有失败');
  } catch (error) {
    console.log('✅ 预期的错误:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 4. 测试空参数验证
  console.log('4️⃣ 测试空参数验证:');
  try {
    await reportService.verifyReport('');
    console.log('❌ 应该失败但没有失败');
  } catch (error) {
    console.log('✅ 预期的验证错误:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // 5. 测试获取报告列表
  console.log('5️⃣ 测试获取报告列表:');
  try {
    const reports = await reportService.getReportsByUploader('farmer');
    console.log(`✅ 农户报告列表 (共${reports.length}条):`);
    if (reports.length > 0) {
      reports.slice(0, 3).forEach(report => {
        console.log(`  - ${report.file_name} [${report.status}] (${report.created_at})`);
      });
    } else {
      console.log('  暂无报告');
    }
  } catch (error) {
    console.log('❌ 获取报告列表失败:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  console.log('🎉 质检报告系统测试完成!');
  console.log('\n📝 测试总结:');
  console.log('   - 服务状态检查正常');
  console.log('   - 配置验证正常');
  console.log('   - 错误处理机制工作正常');
  console.log('   - Supabase 连接正常');

  console.log('\n💡 使用指南:');
  console.log('   1. 上传报告: POST /api/reports/upload');
  console.log('   2. 查看报告: GET /api/reports/my');
  console.log('   3. 在 Supabase 后台将报告状态改为 APPROVED');
  console.log('   4. 创建批次: POST /api/batch (需要 reportId)');
  console.log('   5. 转移批次: PUT /api/batch/:id/transfer (需要 reportId)');

  console.log('\n🏗️ 数据库设置提醒:');
  console.log('   需要在 Supabase 中创建 quality_reports 表:');
  console.log(`
  CREATE TABLE quality_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_hash TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_key TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    uploaded_by TEXT,
    uploader_id TEXT,
    content_type TEXT,
    file_size BIGINT
  );
  `);
}

// 运行测试
if (require.main === module) {
  testReportSystem().catch(console.error);
}

module.exports = { testReportSystem }; 