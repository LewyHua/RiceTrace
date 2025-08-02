# RiceTracerContract 测试文档

## 概述

本目录包含了 `RiceTracerContract` 智能合约的完整测试套件，包括单元测试和集成测试。

## 测试结构

```
__tests__/
├── riceTracerContract.test.ts    # 主要单元测试
├── integration.test.ts           # 集成测试
├── setup.ts                      # 测试环境设置
└── README.md                     # 本文档
```

## 测试覆盖范围

### 单元测试 (`riceTracerContract.test.ts`)

1. **权限测试**
   - 组织类型映射验证
   - 权限检查机制
   - 不同组织的访问控制

2. **核心功能测试**
   - `GetCallerInfo` - 获取调用者信息
   - `GetPermissionMatrix` - 获取权限矩阵
   - `InitLedger` - 初始化账本
   - `CreateRiceBatch` - 创建稻米批次
   - `CompleteStepAndTransfer` - 完成步骤并转移
   - `GetBatchHistory` - 获取批次历史
   - `GetBatchCurrentStatus` - 获取批次当前状态
   - `CreateProduct` - 创建产品
   - `ReadProduct` - 读取产品信息
   - `ReadRiceBatch` - 读取稻米批次
   - `RiceBatchExists` - 检查批次是否存在
   - `GetAllRiceBatches` - 获取所有批次

3. **错误处理测试**
   - 数据不存在的情况
   - 权限不足的情况
   - 数据格式错误的情况

### 集成测试 (`integration.test.ts`)

1. **完整供应链流程测试**
   - 从收获到产品的完整流程
   - 多步骤转移和状态更新
   - 数据一致性验证

2. **权限执行测试**
   - 不同组织角色的权限验证
   - 跨组织操作的权限控制

3. **错误处理和边界情况**
   - 异常数据处理
   - 空状态处理
   - 迭代器错误处理

4. **数据一致性测试**
   - 跨操作的数据完整性
   - 状态同步验证

## 运行测试

### 安装依赖

```bash
npm install
```

### 运行所有测试

```bash
npm test
```

### 运行测试并生成覆盖率报告

```bash
npm run test:coverage
```

### 运行测试监视模式

```bash
npm run test:watch
```

### 运行特定测试文件

```bash
# 只运行单元测试
npx jest riceTracerContract.test.ts

# 只运行集成测试
npx jest integration.test.ts
```

## 测试配置

### Jest 配置 (`jest.config.js`)

- **预设**: `ts-jest` - TypeScript 支持
- **测试环境**: Node.js
- **覆盖率阈值**: 80% (分支、函数、行、语句)
- **覆盖率报告**: 文本、LCOV、HTML
- **测试超时**: 10秒

### 覆盖率要求

- **语句覆盖率**: 80%
- **分支覆盖率**: 80%
- **函数覆盖率**: 80%
- **行覆盖率**: 80%

## 测试最佳实践

### 1. Mock 策略

- 使用 Jest 的 mock 功能模拟 Fabric 环境
- 模拟 `Context` 和 `Stub` 对象
- 隔离外部依赖

### 2. 测试数据

- 使用真实的业务数据结构
- 包含边界情况和异常情况
- 保持测试数据的独立性

### 3. 断言策略

- 验证函数调用和参数
- 检查返回值和状态变化
- 验证错误处理和异常

### 4. 测试组织

- 按功能模块分组
- 使用描述性的测试名称
- 保持测试的独立性

## 持续集成

测试套件设计为可以在 CI/CD 环境中运行：

```yaml
# GitHub Actions 示例
- name: Run Tests
  run: |
    cd fabric-samples/asset-transfer-basic/my-ts
    npm install
    npm run test:coverage
```

## 故障排除

### 常见问题

1. **TypeScript 编译错误**
   - 确保 `tsconfig.json` 配置正确
   - 检查类型定义文件

2. **Mock 不工作**
   - 确保正确导入和设置 mock
   - 检查 mock 函数的返回值

3. **测试超时**
   - 检查异步操作是否正确处理
   - 增加测试超时时间

### 调试技巧

1. **使用 `console.log`**
   ```typescript
   console.log('Debug info:', mockStub.putState.mock.calls);
   ```

2. **检查 Mock 调用**
   ```typescript
   expect(mockStub.putState).toHaveBeenCalledWith(
     'expected_key',
     expect.any(Buffer)
   );
   ```

3. **验证 Mock 状态**
   ```typescript
   expect(mockContext.clientIdentity.getMSPID).toHaveReturnedWith('Org1MSP');
   ```

## 扩展测试

### 添加新测试

1. 在相应的测试文件中添加新的 `describe` 块
2. 编写测试用例
3. 确保测试覆盖新的功能
4. 更新覆盖率要求（如需要）

### 性能测试

考虑添加性能测试来验证：
- 大批量数据处理
- 并发操作处理
- 内存使用情况

### 安全测试

考虑添加安全测试来验证：
- 输入验证
- 权限绕过尝试
- 数据注入攻击 