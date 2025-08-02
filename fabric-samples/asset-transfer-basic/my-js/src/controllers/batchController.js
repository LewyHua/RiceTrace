const riceService = require('../services/RiceService');
const { asyncHandler } = require('../middleware/errorMiddleware');

/**
 * Rice batch controller
 * Handles all HTTP requests related to rice batches
 */

/**
 * Get all batches
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
 * Get batch by ID
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
 * Check if batch exists
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
 * Create new batch (requires test report)
 * POST /api/batch
 */
const createBatch = asyncHandler(async (req, res) => {
  const { reportId } = req.body;
  
  if (!reportId) {
    throw new Error('Creating batch requires a report ID (reportId)');
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
 * Transfer batch ownership (requires test report)
 * PUT /api/batch/:id/transfer
 */
const transferBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reportId } = req.body;

  if (!reportId) {
    throw new Error('Transferring batch requires a report ID (reportId)');
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
 * Add test result
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
 * Add processing record
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
 * Get batch statistics (extended functionality)
 * GET /api/batch/stats
 */
const getBatchStats = asyncHandler(async (req, res) => {
  const batches = await riceService.getAllBatches(req.role);
  
  // Calculate statistics
  const stats = {
    totalBatches: batches.length,
    statusDistribution: {},
    varietyDistribution: {},
    monthlyCreation: {}
  };

  batches.forEach(batch => {
    // Status distribution
    const status = batch.processingStep || 'Unknown';
    stats.statusDistribution[status] = (stats.statusDistribution[status] || 0) + 1;
    
    // Variety distribution
    const variety = batch.variety || 'Unknown';
    stats.varietyDistribution[variety] = (stats.varietyDistribution[variety] || 0) + 1;
    
    // Monthly creation statistics
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
 * Get Oracle service status
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
  
  console.log(`${req.role} completing step: ${step} for batch ${batchId}`);
  
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