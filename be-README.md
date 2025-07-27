# Rice Tracer 后端（区块链服务）启动与使用指南

---

## 目录结构

### Go版本 (原版)
```
fabric-samples/asset-transfer-basic/my-go/
├── chaincode-go
│   ├── sc.go            // 智能合约
│   └── sc_test.go
├── go.mod
├── go.sum
├── riceTracer.go        // 启动地址
└── ...
```

### TypeScript版本 (重构版本)
```
fabric-samples/asset-transfer-basic/my-ts/
├── src/
│   ├── types.ts                    // 数据类型定义
│   ├── riceTracerContract.ts       // 智能合约主要实现
│   └── index.ts                    // 入口文件
├── dist/                           // 编译输出目录
├── package.json
├── tsconfig.json
└── ...
```

---

## 环境要求

- Node.js >= 18
- Docker
- TypeScript (已包含在开发依赖中)
- 详情指南：
    - https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html

---

## 启动方式

### 1. 启动 TypeScript 版本 (推荐)

```bash
./start_backend_ts.sh
```

### 2. 启动 Go 版本 (原版)

```bash
./start_backend.sh
```

---

## TypeScript 重构说明

✅ **重构完成的功能**：
- 完整的数据类型定义 (types.ts)
- 所有业务逻辑方法：
  - `InitLedger` - 初始化账本
  - `CreateRiceBatch` - 创建水稻批次
  - `TransferRiceBatch` - 转移批次所有权
  - `AddTestResult` - 添加质检记录
  - `AddProcessingRecord` - 添加加工记录
  - `CreateProduct` - 创建产品
  - `ReadRiceBatch` - 读取批次信息
  - `ReadProduct` - 读取产品信息
  - `GetAllRiceBatches` - 获取所有批次
  - `RiceBatchExists` - 检查批次是否存在

🔄 **兼容性**：
- 与现有Node.js应用层完全兼容
- API接口保持不变
- 数据格式完全一致

📈 **优势**：
- 统一的技术栈 (JavaScript/TypeScript)
- 更好的类型安全
- 更易维护和调试
- 丰富的npm生态系统

