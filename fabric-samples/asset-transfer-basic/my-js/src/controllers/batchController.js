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
 * 创建新批次
 * POST /api/batch
 */
const createBatch = asyncHandler(async (req, res) => {
  const batchData = {
    location: req.body.location,
    variety: req.body.variety,
    harvestDate: req.body.harvestDate,
    initialTestResult: req.body.initialTestResult,
    owner: req.body.owner,
    initialStep: req.body.initialStep,
    operator: req.body.operator
  };

  const batchId = await riceService.createBatch(req.role, batchData);
  
  res.status(201).json({
    success: true,
    message: '批次创建成功',
    data: {
      batchId,
      ...batchData
    },
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

/**
 * 转移批次所有权
 * PUT /api/batch/:id/transfer
 */
const transferBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const transferData = {
    newOwner: req.body.newOwner,
    operator: req.body.operator
  };

  const result = await riceService.transferBatch(req.role, id, transferData);
  
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

module.exports = {
  getAllBatches,
  getBatchById,
  checkBatchExists,
  createBatch,
  transferBatch,
  addTestResult,
  addProcessingRecord,
  getBatchStats
}; 