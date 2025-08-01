const productService = require('../services/ProductService');
const { asyncHandler } = require('../middleware/errorMiddleware');

/**
 * Product controller
 * Handles all HTTP requests related to products
 */

/**
 * Create product
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
 * Get product by ID
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
 * Get product traceability
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
 * Check if product exists
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