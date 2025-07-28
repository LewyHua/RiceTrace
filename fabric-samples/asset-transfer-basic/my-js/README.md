# 大米供应链追溯系统 - 中台 API

基于 Hyperledger Fabric 的大米供应链追溯系统中台服务，采用现代化的三层架构设计。

## 🏗️ 架构概览

```
my-js/
├── config.js                 # 统一配置管理
├── server.js                 # 主服务器入口
├── app.js                    # API 测试客户端（简化版）
├── src/
│   ├── controllers/          # 控制器层 - 处理HTTP请求
│   │   ├── batchController.js
│   │   └── productController.js
│   ├── services/            # 服务层 - 业务逻辑处理
│   │   ├── RiceService.js
│   │   └── ProductService.js
│   ├── dao/                 # 数据访问层 - Fabric网络交互
│   │   └── FabricDAO.js
│   ├── middleware/          # 中间件层
│   │   ├── authMiddleware.js    # 权限验证
│   │   └── errorMiddleware.js   # 错误处理
│   └── routes/              # 路由配置
│       └── index.js
├── public/                  # 静态文件（前端界面）
└── README.md                # 项目文档
```

## 🚀 快速开始

### 1. 启动 Fabric 网络和智能合约

```bash
# 在项目根目录执行
./start_backend_ts.sh
```

### 2. 启动中台 API 服务

```bash
cd fabric-samples/asset-transfer-basic/my-js
npm install
npm start
```

### 3. 访问服务

- **API 文档**: http://localhost:3000/api/info
- **健康检查**: http://localhost:3000/api/health
- **前端界面**: http://localhost:3000/

## 📋 API 接口

### 批次管理

| 方法 | 路径 | 权限 | 描述 |
|------|------|------|------|
| GET | `/api/batch` | getAll | 获取所有批次 |
| POST | `/api/batch` | create | 创建新批次 |
| GET | `/api/batch/:id` | getById | 获取指定批次 |
| GET | `/api/batch/:id/exists` | getById | 检查批次是否存在 |
| PUT | `/api/batch/:id/transfer` | transfer | 转移批次所有权 |
| POST | `/api/batch/:id/test` | addTest | 添加质检结果 |
| POST | `/api/batch/:id/process` | addProcess | 添加加工记录 |
| GET | `/api/batch/stats` | getAll | 获取批次统计信息 |

### 产品管理

| 方法 | 路径 | 权限 | 描述 |
|------|------|------|------|
| POST | `/api/product` | createProduct | 创建产品 |
| GET | `/api/product/:id` | getProduct | 获取产品信息 |
| GET | `/api/product/:id/exists` | getProduct | 检查产品是否存在 |
| GET | `/api/product/:id/traceability` | getProduct | 获取产品追溯信息 |

## 🔐 权限系统

### 角色定义

- **farmer (农户)**: 创建批次、查看信息
- **processor (加工商)**: 转移批次、添加质检、创建产品
- **consumer (消费者)**: 查看批次和产品信息

### 使用权限

在请求头中添加角色信息：
```http
X-User-Role: farmer
```

或在查询参数中添加：
```http
GET /api/batch?role=farmer
```

## 📝 请求示例

### 创建批次

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -H "X-User-Role: farmer" \
  -d '{
    "location": "黑龙江省五常市",
    "variety": "稻花香",
    "harvestDate": "2024-10-15",
    "initialTestResult": {
      "moisture": "14.5%",
      "purity": "99.2%"
    },
    "owner": "张三农场",
    "initialStep": "收割完成",
    "operator": "张三"
  }'
```

### 转移批次所有权

```bash
curl -X PUT http://localhost:3000/api/batch/batch_12345/transfer \
  -H "Content-Type: application/json" \
  -H "X-User-Role: processor" \
  -d '{
    "newOwner": "ABC加工厂",
    "operator": "李四"
  }'
```

### 查询产品追溯信息

```bash
curl -X GET http://localhost:3000/api/product/product_123/traceability \
  -H "X-User-Role: consumer"
```

## 🧪 测试

### 使用命令行客户端测试

新的 `app.js` 是一个简化的 API 测试客户端，通过 REST API 测试系统功能：

```bash
# 启动 API 服务器
npm start

# 在另一个终端中测试不同角色功能
node app.js --role farmer      # 测试农户功能
node app.js --role processor   # 测试加工商功能  
node app.js --role consumer    # 测试消费者功能
```

**注意**: 测试客户端需要 Node.js 18+ 支持原生 fetch API。

### 使用 API 测试

系统提供了完整的前端测试界面，访问 http://localhost:3000/ 即可使用。

## 🔧 配置说明

### 环境变量

| 变量名 | 默认值 | 描述 |
|--------|---------|------|
| NODE_ENV | development | 运行环境 |
| PORT | 3000 | 服务端口 |
| LOG_LEVEL | info | 日志级别 |
| CHANNEL_NAME | channel1 | Fabric 通道名 |
| CHAINCODE_NAME | basic | 智能合约名 |
| CORS_ORIGIN | * | CORS 允许的源 |

### Fabric 网络配置

配置位于 `config.js` 中，包含：
- 组织信息和端口配置
- 角色权限映射
- 网络超时设置
- 文件路径配置

## 🛠️ 开发指南

### 添加新的业务功能

1. **在智能合约中添加新方法** (my-ts/src/riceTracerContract.ts)
2. **更新 Service 层** (src/services/)
3. **创建或更新 Controller** (src/controllers/)
4. **配置路由** (src/routes/index.js)
5. **更新权限配置** (config.js)

### 错误处理

系统使用统一的错误处理机制：

- 业务错误使用预定义的错误代码
- 所有错误都有标准化的响应格式
- 支持开发环境下的详细错误信息

### 日志系统

- 请求日志：记录所有 HTTP 请求
- 操作日志：记录用户操作和结果
- 错误日志：记录详细的错误信息和堆栈

## 🐛 故障排除

### 常见问题

1. **Fabric 网络连接失败**
   - 确保 Fabric 网络正在运行
   - 检查证书文件路径是否正确

2. **权限被拒绝**
   - 确认请求头中包含正确的角色信息
   - 检查角色是否有执行该操作的权限

3. **端口冲突**
   - 修改 `config.js` 中的端口配置
   - 或设置环境变量 `PORT`

### 调试模式

设置环境变量启用详细日志：
```bash
NODE_ENV=development npm start
```

## 📚 相关文档

- [Hyperledger Fabric 文档](https://hyperledger-fabric.readthedocs.io/)
- [智能合约开发指南](../my-ts/README.md)
- [项目整体架构说明](../../README.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

本项目采用 Apache 2.0 许可证。 