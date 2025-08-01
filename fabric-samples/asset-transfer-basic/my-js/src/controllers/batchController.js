const riceService = require('../services/RiceService');
const { asyncHandler } = require('../middleware/errorMiddleware');

/**
 * 大米批次控制器
 * 处理所有与大米批次相关的HTTP请求
 */

/**
 * 获取所有批次
 * GET /api/batch
 */
const getAllBatches = asyncHandler(async (req, res) => {
  const batches = await riceService.getAllBatches(req.role);
  
  res.json({
    success: true,
    data: batches,
    count: batches.length,
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

/**
 * 根据ID获取批次
 * GET /api/batch/:id
 */
const getBatchById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const batch = await riceService.getBatchById(req.role, id);
  
  res.json({
    success: true,
    data: batch,
    batchId: id,
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

/**
 * 检查批次是否存在
 * GET /api/batch/:id/exists
 */
const checkBatchExists = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exists = await riceService.batchExists(req.role, id);
  
  res.json({
    success: true,
    exists,
    batchId: id,
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

/**
 * 创建新批次 (需要质检报告)
 * POST /api/batch
 */
const createBatch = asyncHandler(async (req, res) => {
  const { reportId } = req.body;
  
  if (!reportId) {
    throw new Error('创建批次需要提供质检报告ID (reportId)');
  }

  const batchData = {
    location: req.body.location,
    variety: req.body.variety,
    harvestDate: req.body.harvestDate,
    initialTestResult: req.body.initialTestResult,
    owner: req.body.owner,
    initialStep: req.body.initialStep,
    operator: req.body.operator
  };

  const result = await riceService.createBatch(req.role, batchData, reportId);
  
  res.status(201).json({
    success: true,
    message: result.message,
    data: {
      batchId: result.batchId,
      reportId: result.reportId,
      reportHash: result.reportHash,
      ...batchData
    },
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

/**
 * 转移批次所有权 (需要质检报告)
 * PUT /api/batch/:id/transfer
 */
const transferBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reportId } = req.body;

  if (!reportId) {
    throw new Error('转移批次需要提供质检报告ID (reportId)');
  }

  const transferData = {
    newOwner: req.body.newOwner,
    operator: req.body.operator
  };

  const result = await riceService.transferBatch(req.role, id, transferData, reportId);
  
  res.json({
    success: true,
    ...result,
    role: req.role
  });
});

/**
 * 添加质检结果
 * POST /api/batch/:id/test
 */
const addTestResult = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const testData = {
    testId: req.body.testId,
    testerId: req.body.testerId,
    timestamp: req.body.timestamp,
    temperature: req.body.temperature,
    report: req.body.report,
    result: req.body.result
  };

  const result = await riceService.addTestResult(req.role, id, testData);
  
  res.json({
    success: true,
    ...result,
    role: req.role
  });
});

/**
 * 添加加工记录
 * POST /api/batch/:id/process
 */
const addProcessingRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const processData = {
    step: req.body.step,
    operator: req.body.operator
  };

  const result = await riceService.addProcessingRecord(req.role, id, processData);
  
  res.json({
    success: true,
    ...result,
    role: req.role
  });
});

/**
 * 获取批次统计信息（扩展功能）
 * GET /api/batch/stats
 */
const getBatchStats = asyncHandler(async (req, res) => {
  const batches = await riceService.getAllBatches(req.role);
  
  // 计算统计信息
  const stats = {
    totalBatches: batches.length,
    statusDistribution: {},
    varietyDistribution: {},
    monthlyCreation: {}
  };

  batches.forEach(batch => {
    // 状态分布
    const status = batch.processingStep || 'Unknown';
    stats.statusDistribution[status] = (stats.statusDistribution[status] || 0) + 1;
    
    // 品种分布
    const variety = batch.variety || 'Unknown';
    stats.varietyDistribution[variety] = (stats.varietyDistribution[variety] || 0) + 1;
    
    // 月度创建统计
    if (batch.harvestDate) {
      const month = new Date(batch.harvestDate).toISOString().substring(0, 7); // YYYY-MM
      stats.monthlyCreation[month] = (stats.monthlyCreation[month] || 0) + 1;
    }
  });

  res.json({
    success: true,
    data: stats,
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

/**
 * 获取Oracle服务状态
 */
const getOracleStatus = asyncHandler(async (req, res) => {
  const status = await riceService.getOracleStatus();
  
  res.json({
    success: true,
    data: {
      ...status,
      systemTime: new Date().toISOString()
    },
    message: 'Oracle service status retrieved successfully'
  });
});

/**
 * Complete step and transfer batch - new unified endpoint
 * POST /api/v2/batch/:id/event
 */
const completeStepAndTransfer = asyncHandler(async (req, res) => {
  const { id: batchId } = req.params;
  const { fromOperator, toOperator, step, reportId } = req.body;
  
  // Validate required fields
  if (!fromOperator || !toOperator || !step || !reportId) {
    throw new Error('All fields are required: fromOperator, toOperator, step, reportId');
  }
  
  console.log(`🔄 ${req.role} completing step: ${step} for batch ${batchId}`);
  
  const result = await riceService.completeStepAndTransfer(
    req.role,
    batchId,
    fromOperator,
    toOperator,
    step,
    reportId
  );
  
  res.json({
    success: true,
    data: result,
    batchId,
    step,
    fromOperator,
    toOperator,
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get current batch owner for auto-fill
 * GET /api/batch/:id/owner
 */
const getCurrentBatchOwner = asyncHandler(async (req, res) => {
  const { id: batchId } = req.params;
  
  const currentOwner = await riceService.getCurrentBatchOwner(req.role, batchId);
  
  res.json({
    success: true,
    data: { currentOwner },
    batchId,
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  getAllBatches,
  getBatchById,
  checkBatchExists,
  createBatch,
  transferBatch,
  addTestResult,
  addProcessingRecord,
  getBatchStats,
  getOracleStatus,
  completeStepAndTransfer,
  getCurrentBatchOwner
}; 