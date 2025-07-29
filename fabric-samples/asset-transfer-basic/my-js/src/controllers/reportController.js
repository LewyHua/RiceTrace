const multer = require('multer');
const reportService = require('../services/ReportService');
const { asyncHandler, createError } = require('../middleware/errorMiddleware');

// 配置 Multer 用于内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(createError.validation(`不支持的文件类型: ${file.mimetype}`), false);
    }
  }
});

/**
 * 上传质检报告
 */
const uploadReport = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createError.validation('请选择要上传的文件');
  }

  const uploaderInfo = {
    role: req.role,
    userId: req.headers['x-user-id'] || null
  };

  console.log(`📤 ${req.role} 正在上传质检报告: ${req.file.originalname}`);

  const result = await reportService.uploadReport(req.file, uploaderInfo);

  res.json({
    success: true,
    data: result,
    message: '质检报告上传成功'
  });
});

/**
 * 验证质检报告
 */
const verifyReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  const result = await reportService.verifyReport(reportId);

  res.json({
    success: true,
    data: result.data,
    message: '报告验证成功'
  });
});

/**
 * 获取我的报告列表
 */
const getMyReports = asyncHandler(async (req, res) => {
  const reports = await reportService.getReportsByUploader(req.role);

  res.json({
    success: true,
    data: reports,
    total: reports.length,
    role: req.role
  });
});

/**
 * 获取报告服务状态
 */
const getReportStatus = asyncHandler(async (req, res) => {
  const status = reportService.getServiceStatus();

  res.json({
    success: true,
    data: {
      ...status,
      systemTime: new Date().toISOString()
    },
    message: '报告服务状态获取成功'
  });
});

/**
 * 根据ID获取报告详情
 */
const getReportById = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  const result = await reportService.verifyReport(reportId);

  res.json({
    success: true,
    data: result.data,
    message: '报告详情获取成功'
  });
});

module.exports = {
  upload, // Multer中间件
  uploadReport,
  verifyReport,
  getMyReports,
  getReportStatus,
  getReportById
}; 