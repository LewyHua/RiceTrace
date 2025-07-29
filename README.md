# 大米供应链追溯系统 - 项目总览

Rice Tracer 是一个基于 Hyperledger Fabric 区块链的水稻溯源系统，支持农户、加工商、消费者三类角色，实现水稻批次、加工、质检、产品等全流程追踪。

---

## 核心技术栈

-   **区块链**: Hyperledger Fabric v2.x + TypeScript 智能合约
-   **中台**: Node.js + Express + TypeScript
-   **数据库**: Supabase (PostgreSQL + CloudFlare R2存储桶)
-   **SDK**: @hyperledger/fabric-gateway
-   **开发**: TypeScript/JavaScript ES6+

---

## 项目结构

```
RiceTrace/
├── fabric-samples/
│   ├── test-network/           # Fabric 测试网络
│   └── asset-transfer-basic/
│       ├── my-ts/              # TypeScript 智能合约
│       │   └── src/
│       │       ├── riceTracerContract.ts  # 主合约
│       │       ├── types.ts               # 数据类型定义
│       │       └── index.ts
│       └── my-js/              # Node.js 中台 API & 前端
│           ├── src/                      # 后端源码 (Controller, Service, DAO)
│           ├── public/                   # 前端静态文件
│           ├── config.js                 # 统一配置
│           ├── server.js                 # API 服务器入口
│           ├── app.js                    # API 测试客户端
│           └── ...
└── README.md                   # 本项目总览文档
```

---

## 快速开始

### 1. 环境要求

-   Node.js >= 18
-   Docker
-   TypeScript (已包含在开发依赖中)
-   详情指南：[Hyperledger Fabric 前置条件](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html) 完成所有前置条件后，执行./install-fabric.sh 安装Fabric网络

### 2. 启动 Fabric 网络和智能合约 (后端)

在 `RiceTrace` 项目根目录执行：

```bash
./start_backend_ts.sh
```

### 3. 安装并启动中台 API 服务 (前端/后端)

```bash
cd fabric-samples/asset-transfer-basic/my-js
npm install
npm start
```

### 4. 访问服务

-   **API 文档**: `http://localhost:3000/api/info`
-   **健康检查**: `http://localhost:3000/api/health`
-   **前端界面**: `http://localhost:3000/`

---

## 中台 API 接口 (`my-js`)

### 1. 架构概览

`my-js` 服务采用三层架构设计：

```
my-js/
├── config.js                 # 统一配置管理
├── server.js                 # 主服务器入口
├── app.js                    # API 测试客户端（简化版）
├── src/
│   ├── controllers/          # 控制器层 - 处理HTTP请求
│   │   ├── batchController.js
│   │   ├── productController.js
│   │   └── reportController.js
│   ├── services/             # 服务层 - 业务逻辑处理
│   │   ├── RiceService.js
│   │   ├── ProductService.js
│   │   └── ReportService.js
│   ├── dao/                  # 数据访问层 - Fabric网络交互
│   │   └── FabricDAO.js
│   ├── middleware/           # 中间件层
│   │   ├── authMiddleware.js    # 权限验证
│   │   └── errorMiddleware.js   # 错误处理
│   └── routes/               # 路由配置
│       └── index.js
├── public/                   # 静态文件（前端界面）
└── ...
```

### 2. API 端点概览

| 方法 | 路径 | 权限 | 描述 |
| :--- | :--- | :--- | :--- |
| GET | `/api/batch` | `getAll` | 获取所有批次 |
| POST | `/api/batch` | `create` | 创建新批次 (需 `reportId`) |
| GET | `/api/batch/:id` | `getById` | 获取指定批次 |
| GET | `/api/batch/:id/exists` | `getById` | 检查批次是否存在 |
| PUT | `/api/batch/:id/transfer` | `transfer` | 转移批次所有权 (需 `reportId`) |
| POST | `/api/batch/:id/test` | `addTest` | 添加质检结果 |
| POST | `/api/batch/:id/process` | `addProcess` | 添加加工记录 |
| GET | `/api/batch/stats` | `getAll` | 获取批次统计信息 |
| POST | `/api/product` | `createProduct` | 创建产品 |
| GET | `/api/product/:id` | `getProduct` | 获取产品信息 |
| GET | `/api/product/:id/exists` | `getProduct` | 检查产品是否存在 |
| GET | `/api/product/:id/traceability` | `getProduct` | 获取产品追溯信息 |
| POST | `/api/reports/upload` | 任何角色 | 上传质检报告文件 |
| GET | `/api/reports/my` | 任何角色 | 获取当前用户的报告列表 |
| GET | `/api/reports/status` | 任何角色 | 获取报告服务状态 |
| GET | `/api/reports/:reportId/verify` | 任何角色 | 验证报告 (调试用) |
| GET | `/api/reports/:reportId` | 任何角色 | 获取报告详情 |
| POST | `/api/reports/admin/update-status` | `admin` | 管理员更新报告状态 (开发测试用) |
| GET | `/api/oracle/status` | 任何角色 | 获取 Oracle 服务状态 |

### 3. 权限系统

系统支持多种角色，每种角色拥有不同的接口权限，通过 HTTP 请求头 `X-User-Role` 或 URL 参数 `?role=` 指定。

-   **farmer (农户)**: 创建批次、查看信息
-   **processor (加工商)**: 转移批次、添加质检、创建产品
-   **consumer (消费者)**: 查看批次和产品信息
-   **admin (管理员)**: （仅用于开发测试）审核报告

示例：
```bash
curl -H "X-User-Role: farmer" http://localhost:3000/api/batch
```

### 4. 请求示例

#### 创建批次 (农户权限)

需要提供 `reportId`。

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -H "X-User-Role: farmer" \
  -d '{
    "reportId": "your-approved-report-id",
    "location": "黑龙江省五常市",
    "variety": "稻花香",
    "harvestDate": "2024-10-15",
    "owner": "张三农场",
    "initialStep": "收割完成",
    "operator": "张三"
  }'
```

#### 转移批次所有权 (加工商权限)

需要提供 `reportId`。

```bash
curl -X PUT http://localhost:3000/api/batch/batch_12345/transfer \
  -H "Content-Type: application/json" \
  -H "X-User-Role: processor" \
  -d '{
    "reportId": "your-new-approved-report-id",
    "newOwner": "ABC加工厂",
    "operator": "李四"
  }'
```

#### 上传质检报告 (任何角色)

```bash
c/p/b -X POST http://localhost:3000/api/reports/upload \
  -H "X-User-Role: farmer" \
  -F "report=@/path/to/your/quality_report.pdf"
```

#### 审核质检报告 (管理员权限 - 仅开发测试用)

```bash
c/p/b -X POST http://localhost:3000/api/reports/admin/update-status \
  -H "Content-Type: application/json" \
  -H "X-User-Role: admin" \
  -d '{"reportId": "your-report-id", "status": "APPROVED"}'
```

---

## Oracle 服务与质检报告系统

### 1. 概述

Oracle 服务集成允许系统从外部权威数据源验证质检报告，确保链上数据的可信度。在 MVP 阶段，Oracle 直接调用内部 `ReportService` 进行验证，无需外部 HTTP 请求。

### 2. 数据库设计 (`Supabase`)

**`quality_reports` 表结构**:

```sql
CREATE TABLE quality_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_hash TEXT NOT NULL,              -- SHA-256 文件哈希
  file_name TEXT NOT NULL,              -- 原始文件名
  file_url TEXT NOT NULL,               -- R2 访问URL
  file_key TEXT NOT NULL,               -- R2 存储键
  status TEXT DEFAULT 'PENDING'         -- 审核状态 (PENDING, APPROVED, REJECTED)
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  uploaded_by TEXT,                     -- 上传者角色
  uploader_id TEXT,                     -- 上传者ID
  content_type TEXT,                    -- MIME类型
  file_size BIGINT                      -- 文件大小
);
```

### 3. 链上数据结构扩展 (`my-ts/src/types.ts`)

智能合约的 `TestResult` 类型已扩展，包含 Oracle 验证相关字段：

```typescript
export class TestResult {
  // ... 原有字段

  // Oracle 验证相关字段
  public isVerified: boolean = false;
  public verificationSource?: string;
  public externalReportId?: string;
  public fileHash?: string;
  public tester?: string;
  public testDate?: string;
  public laboratory?: string;
  public certificationNumber?: string;
  public notes?: string;
}
```

---

## 前端界面 (`public/`)

前端采用简洁的静态HTML页面，通过JavaScript与后端API交互。

-   **首页**: `index.html` (角色选择，快速入口)
-   **上传报告**: `upload-report.html`
-   **报告审核**: `admin-reports.html` (开发测试用，提供便捷的报告审核功能)
-   **创建批次**: `create.html`
-   **转移批次**: `transfer.html`
-   **批次详情**: `detail.html`
-   **样式**: `style.css` (简化风格，无高级特效，以功能和稳定性为优先)
-   **通用JS**: `common.js` (API请求封装、UI渲染辅助)

**质检记录显示优化**:
-   在 `detail.html` 中，质检记录采用卡片式布局，避免表格内容过长。
-   长文本（如文件哈希、报告内容）自动截断并显示省略号。
-   状态（PASSED/FAILED）有颜色区分，增强可读性。

---

## 环境配置

### 必需的环境变量 (`.env` 文件或系统环境变量)

在 `fabric-samples/asset-transfer-basic/my-js` 目录下创建 `.env` 文件：

```dotenv
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Cloudflare R2 配置
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_BUCKET_NAME=your-bucket-name

# 其他配置
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

---

## 开发指南

### 新增业务功能

1.  在智能合约 (`my-ts/src/riceTracerContract.ts`) 中添加新方法。
2.  更新服务层 (`src/services/`)，处理业务逻辑。
3.  创建或更新控制器 (`src/controllers/`)，处理 HTTP 请求。
4.  配置路由 (`src/routes/index.js`)。
5.  更新权限配置 (`config.js`)。
6.  更新前端页面以支持新功能。

### 错误处理

-   系统使用统一的错误处理机制，业务错误使用预定义的错误代码。
-   所有错误都有标准化的响应格式。
-   支持开发环境下的详细错误信息。
-   报告未通过审核时，提供用户友好的错误提示（如"报告正在等待审核"、"报告已被拒绝"）。

### 日志系统

-   请求日志：记录所有 HTTP 请求。
-   操作日志：记录用户操作和结果。
-   错误日志：记录详细的错误信息和堆栈。

---

## 测试与部署

### 1. 运行测试

在 `fabric-samples/asset-transfer-basic/my-js` 目录下：

```bash
npm start

# 在另一个终端中测试不同角色功能 (简化版API测试客户端)
node app.js --role farmer      # 测试农户功能
node app.js --role processor   # 测试加工商功能
node app.js --role consumer    # 测试消费者功能
```

**手动测试步骤**:
1.  确保 Fabric 网络和 API 服务器已启动。
2.  打开浏览器访问 `http://localhost:3000`。
3.  点击 **"上传质检报告"** 按钮，上传一个文件。
4.  点击 **"报告审核"** 按钮（紫色），在列表中找到刚上传的报告，点击 **"批准"**。
5.  点击 **"农户"** 或 **"加工/质检"** 按钮，进入对应角色页面。
6.  尝试 **"创建批次"** 或 **"转移批次"**，并输入刚刚批准的报告ID。
7.  点击 **"消费者"** 按钮，查询批次详情，查看优化的质检记录显示。

### 2. 生产部署建议

-   **安全**: 限制 `admin-reports.html` 的访问权限，或在生产环境删除此文件，改用 Supabase 后台进行正式审核。
-   **性能**: 考虑为大量报告添加分页功能。
-   **监控**: 添加更完善的操作日志记录和报警机制。
-   **备份**: 确保 Supabase 数据定期备份。
-   **文件安全**: 细化 Cloudflare R2 的访问策略，限制公共读写。

---

## 总结

当前项目已达到 **MVP (最小可行产品)** 标准：

-   ✅ 核心功能完整 (从报告上传到链上追溯)
-   ✅ 用户体验良好 (友好的错误提示、优化的数据显示)
-   ✅ 错误处理完善
-   ✅ 开发调试便利 (内置审核页面)
-   ✅ 架构设计合理 (三层架构、Oracle集成)

所有关键问题已解决，系统可以正常运行和测试。

---

