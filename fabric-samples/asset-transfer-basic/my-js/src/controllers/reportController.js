const multer = require('multer');
const reportService = require('../services/ReportService');
const { asyncHandler, createError } = require('../middleware/errorMiddleware');

// Configure Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(createError.validation(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

/**
 * Upload test report
 */
const uploadReport = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createError.validation('Please select a file to upload');
  }

  const uploaderInfo = {
    role: req.role,
    userId: req.headers['x-user-id'] || null
  };

  console.log(`${req.role} is uploading test report: ${req.file.originalname}`);

  const result = await reportService.uploadReport(req.file, uploaderInfo);

  res.json({
    success: true,
    data: result,
    message: 'Test report uploaded successfully'
  });
});

/**
 * Verify test report
 */
const verifyReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  const result = await reportService.verifyReport(reportId);

  res.json({
    success: true,
    data: result.data,
    message: 'Report verified successfully'
  });
});

/**
 * Get my report list
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
 * Get report service status
 */
const getReportStatus = asyncHandler(async (req, res) => {
  const status = reportService.getServiceStatus();

  res.json({
    success: true,
    data: {
      ...status,
      systemTime: new Date().toISOString()
    },
    message: 'Report service status retrieved successfully'
  });
});

/**
 * Get report details by ID
 */
const getReportById = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  const result = await reportService.verifyReport(reportId);

  res.json({
    success: true,
    data: result.data,
    message: 'Report details retrieved successfully'
  });
});

/**
 * Admin update report status (for development testing)
 */
const updateReportStatus = asyncHandler(async (req, res) => {
  const { reportId, status } = req.body;

  if (!reportId || !status) {
    throw new Error('Report ID and status cannot be empty');
  }

  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
    throw new Error('Invalid status value');
  }

  const result = await reportService.updateReportStatus(reportId, status);

  res.json({
    success: true,
    data: result,
    message: `Report status updated to ${status}`
  });
});

module.exports = {
  upload, // Multer middleware
  uploadReport,
  verifyReport,
  getMyReports,
  getReportStatus,
  getReportById,
  updateReportStatus
}; 