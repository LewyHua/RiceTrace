/**
 * 测试转移批次修复
 */

// 加载环境变量
require('dotenv').config();

// 设置环境变量
process.env.SUPABASE_URL = "https://pqfhwvalppordzhwhqrl.supabase.co";
process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZmh3dmFscHBvcmR6aHdocXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTU4MjgsImV4cCI6MjA2OTI5MTgyOH0.wvx3B1GmFcc3WUsWUEpr8-BIkb69mAvxMk1WD7qrCFE";
process.env.CLOUDFLARE_ACCOUNT_ID = "7322b43f6e418f636bbc3fb6cfdfc11a";
process.env.CLOUDFLARE_ACCESS_KEY_ID = "f3c667623db7e6826f5dd221b93d09fe";
process.env.CLOUDFLARE_SECRET_ACCESS_KEY = "bce324e9e394a1229f86e819915e69191e0b544d570ad7341f97fdfdb3e6536f";
process.env.CLOUDFLARE_BUCKET_NAME = "ricetrace";

const riceService = require('./src/services/RiceService');

async function testTransferFix() {
  console.log('🔧 测试转移批次修复...\n');

  try {
    // 首先测试创建批次（需要一个现有的已审核报告ID）
    console.log('1️⃣ 测试创建批次（使用测试报告ID）');
    
    // 这里使用一个示例的报告ID，实际使用时需要先上传并审核报告
    const testReportId = '7e0af982-29c8-4d79-a0ed-b3fca2eb2b40'; // 使用之前的报告ID
    
    const batchData = {
      location: 'Test Location',
      variety: 'Test Variety', 
      harvestDate: '2024-01-15',
      initialTestResult: {
        testId: 'test_' + Date.now(),
        testerId: 'TestTester',
        result: 'PASSED'
      },
      owner: 'Test Farmer',
      initialStep: 'Harvested',
      operator: 'Test Operator'
    };

    console.log('创建批次参数:', batchData);
    
    try {
      const createResult = await riceService.createBatch('farmer', batchData, testReportId);
      console.log('✅ 批次创建成功:', createResult);
      
      const batchId = createResult.batchId;
      
      // 等待一下确保创建完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 测试转移批次
      console.log('\n2️⃣ 测试转移批次');
      
      const transferData = {
        newOwner: 'Test Processor',
        operator: 'Test Operator'
      };
      
      console.log('转移参数:', { batchId, transferData, reportId: testReportId });
      
      const transferResult = await riceService.transferBatch('processor', batchId, transferData, testReportId);
      console.log('✅ 批次转移成功:', transferResult);
      
    } catch (createError) {
      console.log('❌ 创建批次失败:', createError.message);
      
      // 如果创建失败，尝试转移现有批次
      console.log('\n📝 尝试转移现有批次...');
      
      const existingBatchId = 'batch_1753757734535_syiaw45wm'; // 使用之前的批次ID
      
      const transferData = {
        newOwner: 'Test Processor New',
        operator: 'Test Operator New'
      };
      
      try {
        const transferResult = await riceService.transferBatch('processor', existingBatchId, transferData, testReportId);
        console.log('✅ 现有批次转移成功:', transferResult);
      } catch (transferError) {
        console.log('❌ 批次转移失败:', transferError.message);
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  // 等待几秒钟确保网络部署完成
  setTimeout(() => {
    testTransferFix().catch(console.error);
  }, 10000);
}

module.exports = { testTransferFix }; 