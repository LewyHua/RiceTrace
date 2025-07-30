const productService = require('../services/ProductService');
const { asyncHandler } = require('../middleware/errorMiddleware');

/**
 * 产品控制器
 * 处理所有与产品相关的HTTP请求
 */

/**
 * 创建产品
 * POST /api/product
 */
const createProduct = asyncHandler(async (req, res) => {
  const productData = {
    productId: req.body.productId,
    batchId: req.body.batchId,
    packageDate: req.body.packageDate,
    owner: req.body.owner
  };

  const result = await productService.createProduct(req.role, productData);
  
  res.status(201).json({
    success: true,
    ...result,
    data: productData,
    role: req.role
  });
});

/**
 * 根据ID获取产品信息
 * GET /api/product/:id
 */
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await productService.getProductById(req.role, id);
  
  res.json({
    success: true,
    data: product,
    productId: id,
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

/**
 * 获取产品的完整追溯信息
 * GET /api/product/:id/traceability
 */
const getProductTraceability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const traceability = await productService.getProductTraceability(req.role, id);
  
  res.json({
    success: true,
    data: traceability,
    productId: id,
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

/**
 * 检查产品是否存在
 * GET /api/product/:id/exists
 */
const checkProductExists = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exists = await productService.productExists(req.role, id);
  
  res.json({
    success: true,
    exists,
    productId: id,
    role: req.role,
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  createProduct,
  getProductById,
  getProductTraceability,
  checkProductExists
}; 