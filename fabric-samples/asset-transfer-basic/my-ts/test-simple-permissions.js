#!/usr/bin/env node

/*
 * 简化版权限测试脚本
 */

const { RiceTracerContract } = require('./dist/index');

// 模拟Context对象
class MockContext {
    constructor(mspId) {
        this.clientIdentity = {
            getMSPID: () => mspId
        };
        this.stub = {
            getTxTimestamp: () => ({
                seconds: { toNumber: () => Math.floor(Date.now() / 1000) }
            }),
            getState: async (key) => Buffer.from('{}'),
            putState: async (key, value) => {
                console.log(`📝 模拟存储: ${key}`);
            }
        };
    }
}

async function testPermissions() {
    console.log('🧪 开始权限系统测试\n');
    
    const contract = new RiceTracerContract();
    
    // 测试不同MSP的权限
    const testCases = [
        { name: '农场 (Org1MSP)', mspId: 'Org1MSP' },
        { name: '中间商 (Org2MSP)', mspId: 'Org2MSP' },
        { name: '消费者 (Org3MSP)', mspId: 'Org3MSP' }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n🏢 测试 ${testCase.name}`);
        console.log('─'.repeat(40));
        
        const ctx = new MockContext(testCase.mspId);
        
        // 测试获取机构信息
        try {
            const callerInfo = await contract.GetCallerInfo(ctx);
            console.log(`✅ 机构信息: ${JSON.stringify(callerInfo, null, 2)}`);
        } catch (error) {
            console.log(`❌ 获取机构信息失败: ${error.message}`);
        }
        
        // 测试CreateRiceBatch权限（应该只有Org1MSP能成功）
        console.log('\n测试CreateRiceBatch权限:');
        try {
            await contract.CreateRiceBatch(
                ctx, 
                'test-batch-' + Date.now(), 
                'Test Origin', 
                'Test Variety', 
                '2024-01-01',
                JSON.stringify({
                    testId: 't1',
                    testerId: 'tester1', 
                    timestamp: new Date().toISOString(),
                    temperature: '20C',
                    report: 'Test Report',
                    result: 'Passed'
                }),
                'Test Owner',
                'Harvested',
                'Test Operator'
            );
            console.log(`✅ CreateRiceBatch 调用成功`);
        } catch (error) {
            if (error.message.includes('权限不足')) {
                console.log(`🔒 CreateRiceBatch 权限拒绝: ${error.message}`);
            } else {
                console.log(`❌ CreateRiceBatch 其他错误: ${error.message}`);
            }
        }
        
        // 测试AddTestResult权限（应该只有Org2MSP能成功）
        console.log('\n测试AddTestResult权限:');
        try {
            await contract.AddTestResult(
                ctx,
                'test-batch',
                JSON.stringify({
                    testId: 't2',
                    testerId: 'tester2',
                    timestamp: new Date().toISOString(),
                    temperature: '22C', 
                    report: 'Test Report 2',
                    result: 'Passed'
                })
            );
            console.log(`✅ AddTestResult 调用成功`);
        } catch (error) {
            if (error.message.includes('权限不足')) {
                console.log(`🔒 AddTestResult 权限拒绝: ${error.message}`);
            } else {
                console.log(`❌ AddTestResult 其他错误: ${error.message}`);
            }
        }
    }
    
    // 测试权限配置矩阵
    console.log('\n\n📊 权限配置矩阵:');
    console.log('='.repeat(50));
    try {
        const ctx = new MockContext('Org1MSP');
        const matrix = await contract.GetPermissionMatrix(ctx);
        console.log(matrix);
    } catch (error) {
        console.log(`❌ 获取权限配置失败: ${error.message}`);
    }
    
    console.log('\n🎉 权限系统测试完成！');
}

testPermissions().catch(error => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
}); 