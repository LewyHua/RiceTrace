#!/usr/bin/env node

/*
 * 改进版权限测试脚本 - 修复mock数据问题
 */

const { RiceTracerContract } = require('./dist/index');

// 模拟状态存储
const mockState = new Map();

// 改进的Mock Context对象
class ImprovedMockContext {
    constructor(mspId) {
        this.clientIdentity = {
            getMSPID: () => mspId
        };
        this.stub = {
            getTxTimestamp: () => ({
                seconds: { toNumber: () => Math.floor(Date.now() / 1000) }
            }),
            getState: async (key) => {
                const value = mockState.get(key);
                return value || Buffer.from('');
            },
            putState: async (key, value) => {
                mockState.set(key, value);
                console.log(`📝 存储成功: ${key}`);
            },
            getStateByRange: async (startKey, endKey) => {
                // 模拟迭代器
                return {
                    next: async () => ({ done: true }),
                    close: async () => {}
                };
            }
        };
    }
}

async function runCompletePermissionTest() {
    console.log('🧪 开始完整权限系统测试\n');
    
    const contract = new RiceTracerContract();
    let testResults = {
        total: 0,
        passed: 0,
        failed: 0
    };
    
    // 测试场景
    const scenarios = [
        {
            name: '农场权限测试',
            mspId: 'Org1MSP',
            expectedType: 1,
            tests: [
                { method: 'CreateRiceBatch', shouldPass: true },
                { method: 'AddTestResult', shouldPass: false },
                { method: 'TransferRiceBatch', shouldPass: true },
                { method: 'AddProcessingRecord', shouldPass: true },
                { method: 'CreateProduct', shouldPass: false }
            ]
        },
        {
            name: '中间商权限测试',
            mspId: 'Org2MSP', 
            expectedType: 2,
            tests: [
                { method: 'CreateRiceBatch', shouldPass: false },
                { method: 'AddTestResult', shouldPass: true },
                { method: 'TransferRiceBatch', shouldPass: true },
                { method: 'AddProcessingRecord', shouldPass: true },
                { method: 'CreateProduct', shouldPass: true }
            ]
        },
        {
            name: '消费者权限测试',
            mspId: 'Org3MSP',
            expectedType: 3,
            tests: [
                { method: 'CreateRiceBatch', shouldPass: false },
                { method: 'AddTestResult', shouldPass: false },
                { method: 'TransferRiceBatch', shouldPass: false },
                { method: 'AddProcessingRecord', shouldPass: false },
                { method: 'CreateProduct', shouldPass: false }
            ]
        }
    ];
    
    // 预先创建一个测试批次供其他操作使用
    console.log('🔧 预备工作：创建测试批次');
    const setupCtx = new ImprovedMockContext('Org1MSP');
    try {
        await contract.CreateRiceBatch(
            setupCtx,
            'test-batch-setup',
            'Setup Origin',
            'Setup Variety', 
            '2024-01-01',
            JSON.stringify({
                testId: 'setup-test',
                testerId: 'setup-tester',
                timestamp: new Date().toISOString(),
                temperature: '20C',
                report: 'Setup Report',
                result: 'Passed'
            }),
            'Setup Owner',
            'Harvested',
            'Setup Operator'
        );
        console.log('✅ 测试批次创建成功\n');
    } catch (error) {
        console.log(`⚠️  测试批次创建失败: ${error.message}\n`);
    }
    
    // 运行所有测试场景
    for (const scenario of scenarios) {
        console.log(`\n🏢 ${scenario.name} (${scenario.mspId})`);
        console.log('='.repeat(50));
        
        const ctx = new ImprovedMockContext(scenario.mspId);
        
        // 验证机构类型
        try {
            const callerInfo = await contract.GetCallerInfo(ctx);
            if (callerInfo.orgType === scenario.expectedType) {
                console.log(`✅ 机构类型正确: ${callerInfo.orgType} (${getOrgTypeName(callerInfo.orgType)})`);
            } else {
                console.log(`❌ 机构类型错误: 期望 ${scenario.expectedType}, 实际 ${callerInfo.orgType}`);
            }
        } catch (error) {
            console.log(`❌ 获取机构信息失败: ${error.message}`);
        }
        
        // 运行所有权限测试
        for (const test of scenario.tests) {
            testResults.total++;
            console.log(`\n测试 ${test.method}:`);
            
            const result = await testMethod(contract, ctx, test.method, test.shouldPass);
            if (result) {
                testResults.passed++;
                console.log(`  ✅ ${test.shouldPass ? '通过' : '正确拒绝'}`);
            } else {
                testResults.failed++;
                console.log(`  ❌ ${test.shouldPass ? '意外失败' : '意外通过'}`);
            }
        }
    }
    
    // 输出测试总结
    console.log('\n\n📊 测试结果总结');
    console.log('='.repeat(50));
    console.log(`总测试数: ${testResults.total}`);
    console.log(`通过测试: ${testResults.passed}`);
    console.log(`失败测试: ${testResults.failed}`);
    console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 所有权限测试通过！权限系统工作完美！');
    } else {
        console.log('\n⚠️  部分测试失败，需要检查权限配置。');
    }
}

async function testMethod(contract, ctx, methodName, shouldPass) {
    try {
        switch (methodName) {
            case 'CreateRiceBatch':
                await contract.CreateRiceBatch(
                    ctx,
                    `test-batch-${Date.now()}-${Math.random()}`,
                    'Test Origin',
                    'Test Variety',
                    '2024-01-01',
                    JSON.stringify({
                        testId: 'test-' + Date.now(),
                        testerId: 'tester',
                        timestamp: new Date().toISOString(),
                        temperature: '20C',
                        report: 'Test Report',
                        result: 'Passed'
                    }),
                    'Test Owner',
                    'Harvested',
                    'Test Operator'
                );
                break;
                
            case 'AddTestResult':
                await contract.AddTestResult(
                    ctx,
                    'test-batch-setup',
                    JSON.stringify({
                        testId: 'test-' + Date.now(),
                        testerId: 'tester',
                        timestamp: new Date().toISOString(),
                        temperature: '22C',
                        report: 'Test Report',
                        result: 'Passed'
                    })
                );
                break;
                
            case 'TransferRiceBatch':
                await contract.TransferRiceBatch(ctx, 'test-batch-setup', 'New Owner', 'Test Operator');
                break;
                
            case 'AddProcessingRecord':
                await contract.AddProcessingRecord(ctx, 'test-batch-setup', 'Test Processing', 'Test Operator');
                break;
                
            case 'CreateProduct':
                await contract.CreateProduct(ctx, `test-product-${Date.now()}`, 'test-batch-setup', new Date().toISOString(), 'Product Owner');
                break;
                
            default:
                throw new Error(`Unknown method: ${methodName}`);
        }
        
        return shouldPass; // 如果应该通过且没有抛出异常，则成功
    } catch (error) {
        if (!shouldPass && error.message.includes('权限不足')) {
            return true; // 应该失败且确实因权限不足而失败，则成功
        }
        
        if (shouldPass) {
            console.log(`    💥 意外错误: ${error.message}`);
        } else {
            console.log(`    🔒 ${error.message}`);
        }
        
        return false;
    }
}

function getOrgTypeName(orgType) {
    switch (orgType) {
        case 1: return '农场';
        case 2: return '中间商/测试机构';
        case 3: return '消费者';
        default: return '未知';
    }
}

runCompletePermissionTest().catch(error => {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
}); 