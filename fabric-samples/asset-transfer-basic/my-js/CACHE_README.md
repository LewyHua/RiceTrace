# Redis 缓存系统说明

## 概述

为了提高查询性能，系统集成了Redis缓存功能，主要缓存以下数据：

- **批次列表** (`getAllBatches`) - 缓存5分钟
- **批次详情** (`getBatchById`) - 缓存10分钟  
- **批次存在性检查** (`batchExists`) - 缓存5分钟

## 配置

### 环境变量

在 `.env` 文件中添加以下Redis配置：

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 缓存配置

缓存配置在 `config.js` 中的 `redis.cache` 部分：

```javascript
cache: {
  // Cache TTL in seconds
  ttl: {
    batchList: 300,      // 5 minutes for batch list
    batchDetail: 600,    // 10 minutes for batch detail
    batchExists: 300     // 5 minutes for batch existence check
  },
  // Cache key prefixes
  keys: {
    batchList: 'batch:list',
    batchDetail: 'batch:detail',
    batchExists: 'batch:exists'
  }
}
```

## 缓存策略

### 读取策略 (Cache-Aside)

1. **查询时**：先检查缓存，如果命中则直接返回
2. **缓存未命中**：从区块链获取数据，然后更新缓存
3. **写入时**：直接写入区块链，然后清除相关缓存

### 缓存失效策略

以下操作会触发缓存失效：

- **创建批次** (`createBatch`) → 清除所有角色的批次列表缓存
- **转移批次** (`transferBatch`) → 清除该批次的所有缓存
- **添加测试结果** (`addTestResult`) → 清除该批次的所有缓存
- **添加处理记录** (`addProcessingRecord`) → 清除该批次的所有缓存
- **完成步骤并转移** (`completeStepAndTransfer`) → 清除该批次的所有缓存

## API 端点

### 缓存管理端点

```
GET    /api/cache/stats          # 获取缓存统计信息
GET    /api/cache/test           # 测试缓存连接
DELETE /api/cache/clear          # 清除所有缓存
DELETE /api/cache/batch-list     # 清除批次列表缓存
DELETE /api/cache/batch/:id      # 清除指定批次的缓存
```

### 使用示例

```bash
# 获取缓存统计
curl -X GET http://localhost:3000/api/cache/stats

# 测试缓存连接
curl -X GET http://localhost:3000/api/cache/test

# 清除所有缓存
curl -X DELETE http://localhost:3000/api/cache/clear

# 清除指定批次缓存
curl -X DELETE http://localhost:3000/api/cache/batch/batch_123
```

## 性能优化

### 缓存键设计

- `batch:list:{role}` - 按角色分别缓存批次列表
- `batch:detail:{batchId}` - 按批次ID缓存详情
- `batch:exists:{batchId}` - 按批次ID缓存存在性

### TTL 设置

- **批次列表**: 5分钟 - 因为列表变化相对频繁
- **批次详情**: 10分钟 - 详情变化较少，可以缓存更久
- **存在性检查**: 5分钟 - 平衡性能和准确性

## 故障处理

### Redis 连接失败

如果Redis连接失败，系统会：

1. 记录错误日志
2. 继续从区块链获取数据
3. 不影响正常业务功能

### 缓存数据不一致

如果怀疑缓存数据不一致，可以：

1. 使用 `DELETE /api/cache/clear` 清除所有缓存
2. 使用 `DELETE /api/cache/batch/:id` 清除特定批次缓存
3. 重启应用自动清除所有缓存

## 监控和调试

### 日志输出

系统会输出详细的缓存操作日志：

```
Cache hit: batch list for role farmer
Cache miss: batch detail for batch_123
Cached batch detail for batch_123 with TTL 600s
Invalidated batch detail cache for batch_123
```

### 缓存统计

通过 `GET /api/cache/stats` 可以查看：

- Redis连接状态
- 内存使用情况
- 缓存命中率等信息

## 部署建议

### 生产环境

1. **Redis集群**: 使用Redis集群提高可用性
2. **持久化**: 配置Redis持久化防止数据丢失
3. **监控**: 集成Redis监控工具
4. **备份**: 定期备份Redis数据

### 开发环境

1. **Docker**: 使用Docker运行Redis
```bash
docker run -d --name redis -p 6379:6379 redis:6.2.5
```

2. **本地安装**: 直接安装Redis
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis
```

## 注意事项

1. **数据一致性**: 缓存数据可能与区块链数据有短暂不一致
2. **内存使用**: 监控Redis内存使用，避免内存溢出
3. **网络延迟**: Redis网络延迟会影响缓存性能
4. **版本兼容**: 确保Redis版本兼容性 