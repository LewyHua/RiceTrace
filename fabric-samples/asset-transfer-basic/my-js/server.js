const express = require('express');
const cors = require('cors');
const { env, validateConfig } = require('./config');
const routes = require('./src/routes');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorMiddleware');

// 验证配置
validateConfig();

const app = express();

// ==================== 中间件配置 ====================

// CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// 基础中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static('public'));

// 请求日志
app.use((req, res, next) => {
  console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ==================== 路由配置 ====================

// API 路由
app.use('/api', routes);

// 根路径重定向到 API 信息
app.get('/', (req, res) => {
  res.redirect('/api/info');
});

// ==================== 错误处理 ====================

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// ==================== 服务器启动 ====================

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log('🚀 大米供应链追溯系统启动成功!');
  console.log(`📍 服务器地址: http://localhost:${PORT}`);
  console.log(`🌐 API 信息: http://localhost:${PORT}/api/info`);
  console.log(`💚 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`📚 前端界面: http://localhost:${PORT}/`);
  console.log(`🔧 环境: ${env.NODE_ENV}`);
  console.log('=' .repeat(50));
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 收到 SIGTERM 信号，正在优雅关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 收到 SIGINT 信号，正在优雅关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;