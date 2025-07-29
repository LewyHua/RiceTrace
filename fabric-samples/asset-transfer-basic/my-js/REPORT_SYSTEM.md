# 质检报告系统实现文档

## 概述

质检报告系统是大米供应链追溯系统的核心组件，实现了**每个关键业务操作都必须关联已验证的质检报告**的要求。系统采用"上传→审核→验证→上链"的完整流程，确保链上数据的可信度和完整性。

## 系统架构

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   前端文件上传   │───▶│  ReportAPI   │───▶│  Cloudflare R2  │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                      ┌──────────────┐    ┌─────────────────┐
                      │ ReportService │───▶│    Supabase     │
                      └──────────────┘    └─────────────────┘
                              │
                              ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   业务操作API   │───▶│ OracleClient │───▶│   区块链网络     │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## 核心组件

### 1. ReportService (`src/services/ReportService.js`)

质检报告的核心业务逻辑服务。

**主要功能:**
- `uploadReport()`: 上传报告文件到 R2，计算哈希，保存元数据到 Supabase
- `verifyReport()`: 验证报告存在性和审核状态
- `getReportsByUploader()`: 按角色获取报告列表
- `getServiceStatus()`: 获取服务状态

**文件处理流程:**
1. 验证文件类型和大小（支持 PDF、JPG、PNG，最大 5MB）
2. 计算 SHA-256 文件哈希
3. 生成唯一文件键：`reports/{timestamp}-{hash_prefix}.{extension}`
4. 上传到 Cloudflare R2
5. 保存元数据到 Supabase，状态为 `PENDING`

### 2. ReportController (`src/controllers/reportController.js`)

处理 HTTP 请求的控制器层。

**API 端点:**
- `POST /api/reports/upload`: 上传质检报告
- `GET /api/reports/my`: 获取我的报告列表
- `GET /api/reports/status`: 获取服务状态
- `GET /api/reports/:reportId/verify`: 验证报告（调试用）
- `GET /api/reports/:reportId`: 获取报告详情

**Multer 配置:**
- 内存存储模式
- 文件大小限制 5MB
- 文件类型过滤

### 3. 业务流程集成

所有关键业务操作现在都需要提供 `reportId`：

#### 创建批次 (`RiceService.createBatch`)
```javascript
// 新的方法签名
async createBatch(role, batchData, reportId)

// 流程:
1. 验证 reportId 参数
2. 调用 Oracle 验证报告
3. 创建批次时附加报告哈希
4. 返回批次ID和报告信息
```

#### 转移批次 (`RiceService.transferBatch`)
```javascript
// 新的方法签名  
async transferBatch(role, batchId, transferData, reportId)

// 流程:
1. 验证 reportId 参数
2. 调用 Oracle 验证报告
3. 转移时附加报告哈希
4. 返回转移结果和报告信息
```

### 4. Oracle 集成

`OracleClient` 已更新为使用内部 `ReportService`：

```javascript
async verifyTestReport(reportId) {
  // 调用 ReportService.verifyReport()
  // 标准化数据格式
  // 返回验证结果
}
```

## 数据库设计

### Supabase 表结构 (`quality_reports`)

```sql
CREATE TABLE quality_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_hash TEXT NOT NULL,              -- SHA-256 文件哈希
  file_name TEXT NOT NULL,              -- 原始文件名
  file_url TEXT NOT NULL,               -- R2 访问URL
  file_key TEXT NOT NULL,               -- R2 存储键
  status TEXT DEFAULT 'PENDING'         -- 审核状态
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  uploaded_by TEXT,                     -- 上传者角色
  uploader_id TEXT,                     -- 上传者ID
  content_type TEXT,                    -- MIME类型
  file_size BIGINT                      -- 文件大小
);
```

### 链上数据结构扩展

智能合约的 `TestResult` 类型已扩展：

```typescript
export class TestResult {
  // ... 原有字段
  
  // Oracle 验证相关字段
  public isVerified: boolean = false;
  public verificationSource?: string;
  public externalReportId?: string;
  public fileHash?: string;
  // ... 其他扩展字段
}
```

## 完整业务流程示例

### 农户创建新批次

1. **上传质检报告**
   ```bash
   curl -X POST http://localhost:3000/api/reports/upload \
     -H "X-User-Role: farmer" \
     -F "report=@quality_report.pdf"
   
   # 返回: { reportId: "uuid-1234", fileHash: "sha256..." }
   ```

2. **人工审核**（在 Supabase 后台）
   ```sql
   UPDATE quality_reports 
   SET status = 'APPROVED' 
   WHERE id = 'uuid-1234';
   ```

3. **创建批次**
   ```bash
   curl -X POST http://localhost:3000/api/batch \
     -H "Content-Type: application/json" \
     -H "X-User-Role: farmer" \
     -d '{
       "reportId": "uuid-1234",
       "location": "山东济南",
       "variety": "优质稻",
       "harvestDate": "2024-10-15",
       "owner": "张农户",
       "operator": "张农户"
     }'
   
   # 系统自动验证报告，创建批次并关联报告哈希
   ```

### 加工商转移批次

1. **上传新的质检报告**（证明接收时质量状况）
2. **等待审核通过**
3. **执行转移**
   ```bash
   curl -X PUT http://localhost:3000/api/batch/batch123/transfer \
     -H "Content-Type: application/json" \
     -H "X-User-Role: processor" \
     -d '{
       "reportId": "uuid-5678",
       "newOwner": "李加工厂",
       "operator": "李厂长"
     }'
   ```

## 环境配置

### 必需的环境变量

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_BUCKET_NAME=your-bucket-name
```

### Cloudflare R2 设置

1. 创建 R2 存储桶 (`ricetrace`)
2. 设置公开访问策略
3. 生成 API 密钥对

### Supabase 设置

1. 创建新项目
2. 执行表结构 SQL
3. 配置行级安全策略（RLS）
4. 获取 URL 和 anon key

## 测试和部署

### 运行测试

```bash
# 测试配置和基本功能
npm run test:reports

# 测试 Oracle 集成
npm run test:oracle

# 启动服务器（使用环境变量）
./start-with-env.sh
```

### API 测试示例

```bash
# 检查服务状态
curl http://localhost:3000/api/reports/status

# 上传报告
curl -X POST http://localhost:3000/api/reports/upload \
  -H "X-User-Role: farmer" \
  -F "report=@test_report.pdf"

# 查看我的报告
curl http://localhost:3000/api/reports/my \
  -H "X-User-Role: farmer"
```

## 安全考虑

1. **文件验证**: 严格的文件类型和大小限制
2. **哈希完整性**: 每个文件都有 SHA-256 哈希验证
3. **权限控制**: 基于角色的访问控制
4. **状态机**: 报告必须经过审核才能使用
5. **不可篡改**: 报告哈希存储在区块链上

## 扩展能力

1. **多种文件类型**: 易于添加新的支持格式
2. **自动审核**: 可集成 AI 或第三方审核服务
3. **通知系统**: 可添加报告状态变更通知
4. **版本控制**: 可支持报告版本管理
5. **批量操作**: 可支持批量上传和审核

## 故障排除

### 常见问题

1. **Supabase 连接失败**: 检查 URL 和密钥配置
2. **R2 上传失败**: 验证 API 密钥和存储桶权限
3. **文件类型错误**: 确保文件是 PDF 或图片格式
4. **报告验证失败**: 检查报告状态是否为 APPROVED

### 日志监控

系统提供详细的控制台日志：
- 📤 文件上传进度
- 🔐 哈希计算完成
- ☁️ R2 上传状态
- 🔍 报告验证过程
- ✅ 操作成功确认 