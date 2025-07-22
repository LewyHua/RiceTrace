# Rice Tracer 前端启动与使用指南

---

## 目录结构

```
my-js/
│
├── fabricClient.js    // Fabric 网络连接与合约调用逻辑
├── server.js          // Express REST API 服务
├── package.json
├── fe-README.md
└── ...
```

---

## 环境要求

- Node.js >= 16
- NPM 或 Yarn

---

## 安装依赖

在 `my-js` 目录下执行：

```bash
npm install
```

---

## 启动前端服务

```bash
npm start
```

---

## 角色与权限

系统支持三种角色，每种角色拥有不同的接口权限：

| 角色       | 权限接口                                      |
| ---------- | --------------------------------------------- |
| farmer     | GetAllRiceBatches、CreateRiceBatch            |
| processor  | TransferRiceBatch、添加质检/加工记录、创建产品 |
| consumer   | ReadRiceBatch、查询产品信息                    |

通过 HTTP 请求头 `X-User-Role` 或 URL 参数 `?role=` 指定角色。

示例：

```bash
curl -H "X-User-Role: farmer" http://localhost:3000/api/batch
```

---

## API 接口示例

### 1. 查询所有批次（农户权限）

```bash
curl -X GET http://localhost:3000/api/batch -H "X-User-Role: farmer"
```

### 2. 创建新批次（农户权限）

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -H "X-User-Role: farmer" \
  -d '{
    "location": "Heilongjiang",
    "variety": "Japonica",
    "harvestDate": "2025-07-22",
    "initialTestResult": {
      "testId": "test123",
      "testerId": "testerA",
      "timestamp": "2025-07-22T10:00:00Z",
      "temperature": "20C",
      "report": "Initial test passed",
      "result": "Passed"
    },
    "owner": "Farmer Zhang",
    "initialStep": "Harvested",
    "operator": "Farmer Zhang"
  }'
```

### 3. 转移批次所有权（加工商权限）

假设批次ID为 `batch1234567890`：

```bash
curl -X PUT http://localhost:3000/api/batch/batch1234567890/transfer \
  -H "Content-Type: application/json" \
  -H "X-User-Role: processor" \
  -d '{
    "newOwner": "Processor A",
    "operator": "Processor A"
  }'
```

### 4. 查询单个批次详情（消费者权限）

```bash
curl -X GET http://localhost:3000/api/batch/batch1234567890 \
  -H "X-User-Role: consumer"
```

### 5. 添加质检记录（加工商权限）

```bash
curl -X POST http://localhost:3000/api/batch/batch1234567890/test \
  -H "Content-Type: application/json" \
  -H "X-User-Role: processor" \
  -d '{
    "testId": "test124",
    "testerId": "testerB",
    "timestamp": "2025-07-23T09:30:00Z",
    "temperature": "22C",
    "report": "Quality check OK",
    "result": "Passed"
  }'
```

### 6. 添加加工记录（加工商权限）

```bash
curl -X POST http://localhost:3000/api/batch/batch1234567890/process \
  -H "Content-Type: application/json" \
  -H "X-User-Role: processor" \
  -d '{
    "step": "Milled",
    "operator": "Processor A"
  }'
```

### 7. 创建产品（加工商权限）

```bash
curl -X POST http://localhost:3000/api/product \
  -H "Content-Type: application/json" \
  -H "X-User-Role: processor" \
  -d '{
    "productId": "product001",
    "batchId": "batch1234567890",
    "packageDate": "2025-07-24",
    "owner": "Processor A"
  }'
```

### 8. 查询产品信息（消费者权限）

```bash
curl -X GET http://localhost:3000/api/product/product001 \
  -H "X-User-Role: consumer"
```

### 9. 查询批次是否存在（农户权限）

```bash
curl -X GET http://localhost:3000/api/batch/batch1234567890/exists \
  -H "X-User-Role: farmer"
```

---

如需进一步美化或有特殊格式需求，请告知！ 