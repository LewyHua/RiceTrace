# Oracle 服务集成说明

## 概述

Oracle 服务集成允许系统从外部权威数据源验证质检报告，确保链上数据的可信度。

## 架构设计

```
[外部质检API] ← HTTP → [OracleClient] ← [RiceService] ← [Controller] ← [前端/API客户端]
                            ↓
                      [FabricDAO] → [区块链]
```

## 核心组件

### 1. 配置 (`config.js`)
```javascript
oracleServices: {
  foodSafety: {
    baseUrl: process.env.FOOD_SAFETY_API_URL,
    apiKey: process.env.FOOD_SAFETY_API_KEY,
    timeout: 10000,
    retryCount: 3
  }
}
```

### 2. Oracle 客户端 (`src/clients/OracleClient.js`)
- 负责与外部 API 交互
- 数据验证和标准化
- 错误处理和重试机制
- 单例模式确保连接复用

### 3. 服务层集成 (`src/services/RiceService.js`)
- `addTestResult()` 方法支持两种模式：
  - **Oracle 模式**: 提供 `externalReportId`，自动验证外部报告
  - **传统模式**: 手动输入质检数据

### 4. 智能合约扩展 (`my-ts/src/types.ts`)
- `TestResult` 类型新增 Oracle 相关字段：
  - `isVerified`: 是否通过 Oracle 验证
  - `verificationSource`: 验证数据来源
  - `externalReportId`: 外部报告ID

## API 使用方式

### Oracle 验证模式
```bash
POST /api/batch/{batchId}/test
Content-Type: application/json
X-User-Role: processor

{
  "externalReportId": "FS-REPORT-12345"
}
```

### 传统手动模式
```bash
POST /api/batch/{batchId}/test
Content-Type: application/json
X-User-Role: processor

{
  "testId": "T001",
  "testerId": "tester1",
  "result": "PASSED"
}
```

### 查看 Oracle 状态
```bash
GET /api/oracle/status
X-User-Role: any
```

## 环境配置

```bash
# .env 文件或环境变量
FOOD_SAFETY_API_URL=https://api.real-food-safety.gov/v1
FOOD_SAFETY_API_KEY=your-real-api-key
```

## 测试方法

```bash
# 测试 Oracle 集成
npm run test:oracle

# 启动服务器
npm start

# 使用 Oracle 验证（需要真实 API）
curl -X POST http://localhost:3000/api/batch/batch1/test \
  -H "Content-Type: application/json" \
  -H "X-User-Role: processor" \
  -d '{"externalReportId": "FS-REPORT-12345"}'
```

## 错误处理

- `ORACLE_ERROR`: 外部 API 调用失败
- `ORACLE_VERIFICATION_FAILED`: 报告验证失败
- `VALIDATION_ERROR`: 参数验证错误

## 扩展指南

要添加新的外部数据源：

1. 在 `config.js` 的 `oracleServices` 中添加配置
2. 在 `OracleClient.js` 中添加对应的验证方法
3. 在相关 Service 中调用新的验证方法
4. 根据需要更新智能合约数据类型

## 安全注意事项

- API 密钥通过环境变量管理，不写入代码
- 支持请求超时和重试机制
- 外部数据经过验证和标准化后再上链
- 所有 Oracle 调用都有详细的日志记录 