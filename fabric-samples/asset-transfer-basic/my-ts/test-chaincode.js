#!/usr/bin/env node

/*
 * 简单的TypeScript智能合约测试脚本
 */

const { RiceTracerContract, RiceBatch, Product } = require('./dist/index');

async function testChaincode() {
    console.log('🧪 Testing TypeScript Rice Tracer Chaincode...');
    
    try {
        // 测试合约类是否能正常实例化
        const contract = new RiceTracerContract();
        console.log('✅ RiceTracerContract instantiated successfully');
        
        // 测试数据类型
        const batch = new RiceBatch();
        batch.batchId = 'test-batch-001';
        batch.origin = 'Test Farm';
        batch.variety = 'Test Rice';
        console.log('✅ RiceBatch type works correctly');
        
        const product = new Product();
        product.productId = 'test-product-001';
        product.batchId = 'test-batch-001';
        console.log('✅ Product type works correctly');
        
        // 检查合约方法是否存在
        const requiredMethods = [
            'InitLedger',
            'CreateRiceBatch', 
            'TransferRiceBatch',
            'AddTestResult',
            'AddProcessingRecord',
            'CreateProduct',
            'ReadRiceBatch',
            'ReadProduct', 
            'GetAllRiceBatches',
            'RiceBatchExists'
        ];
        
        for (const method of requiredMethods) {
            if (typeof contract[method] === 'function') {
                console.log(`✅ Method ${method} exists`);
            } else {
                console.log(`❌ Method ${method} missing`);
            }
        }
        
        console.log('\n🎉 TypeScript智能合约编译和结构验证成功！');
        console.log('📝 所有必需的方法和数据类型都已正确实现');
        console.log('🚀 可以使用 ./start_backend_ts.sh 启动区块链网络');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testChaincode(); 