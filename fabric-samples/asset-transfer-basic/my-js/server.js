const express = require('express');

const bodyParser = require('body-parser');
const { getContractByRole } = require('./fabricClient'); // 你自己实现的 Fabric 客户端工厂函数
const { TextDecoder } = require('node:util');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const utf8Decoder = new TextDecoder();

// 角色权限映射
const rolePermissions = {
  farmer: ['getAll', 'create'],
  processor: ['transfer', 'addTest', 'addProcess', 'createProduct'],
  consumer: ['getById', 'getProduct']
};

// 角色权限校验中间件
function checkRolePermission(requiredPermission) {
  return (req, res, next) => {
    const role = req.headers['x-user-role'] || req.query.role || null;
    if (!role) {
      return res.status(400).json({ error: 'Missing role info (use X-User-Role header or ?role=)' });
    }
    const permissions = rolePermissions[role];
    if (!permissions || !permissions.includes(requiredPermission)) {
      return res.status(403).json({ error: `Role '${role}' does not have permission for this operation` });
    }
    req.role = role;
    next();
  };
}

// 1. 查询所有批次（农户权限）
app.get('/api/batch', checkRolePermission('getAll'), async (req, res) => {
  try {
    const contract = await getContractByRole(req.role);
    const resultBytes = await contract.evaluateTransaction('GetAllRiceBatches');
    const resultJson = utf8Decoder.decode(resultBytes);
    res.json(JSON.parse(resultJson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. 创建批次（农户权限）
app.post('/api/batch', checkRolePermission('create'), async (req, res) => {
  const { location, variety, harvestDate, initialTestResult, owner, initialStep, operator } = req.body;
  if (!location || !variety || !harvestDate || !initialTestResult || !owner || !initialStep || !operator) {
    return res.status(400).json({ error: 'Missing required fields: location, variety, harvestDate, initialTestResult, owner, initialStep, operator' });
  }

  try {
    const contract = await getContractByRole(req.role);
    const batchId = `batch${Date.now()}`;
    await contract.submitTransaction(
      'CreateRiceBatch',
      batchId,
      location,
      variety,
      harvestDate,
      JSON.stringify(initialTestResult),
      owner,
      initialStep,
      operator
    );
    res.json({ message: 'Batch created', batchId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 3. 转移批次所有权（加工商权限）
app.put('/api/batch/:id/transfer', checkRolePermission('transfer'), async (req, res) => {
  const batchId = req.params.id;
  const { newOwner, operator } = req.body;
  if (!newOwner || !operator) {
    return res.status(400).json({ error: 'Missing newOwner or operator in request body' });
  }

  try {
    const contract = await getContractByRole(req.role);
    await contract.submitTransaction('TransferRiceBatch', batchId, newOwner, operator);
    // 查询最新批次信息
    const resultBytes = await contract.evaluateTransaction('ReadRiceBatch', batchId);
    const resultJson = utf8Decoder.decode(resultBytes);
    const batch = JSON.parse(resultJson);
    res.json({ message: `Ownership transferred to ${batch.currentOwner}`, newOwner: batch.currentOwner, batchId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 4. 查询单个批次（消费者权限）
app.get('/api/batch/:id', checkRolePermission('getById'), async (req, res) => {
  const batchId = req.params.id;
  try {
    const contract = await getContractByRole(req.role);
    const resultBytes = await contract.evaluateTransaction('ReadRiceBatch', batchId);
    const resultJson = utf8Decoder.decode(resultBytes);
    res.json(JSON.parse(resultJson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 5. 添加质检记录（加工商权限）
app.post('/api/batch/:id/test', checkRolePermission('addTest'), async (req, res) => {
  const batchId = req.params.id;
  const { testId, testerId, timestamp, temperature, report, result } = req.body;
  if (!testId || !testerId || !timestamp || !result) {
    return res.status(400).json({ error: 'Missing required test fields: testId, testerId, timestamp, result' });
  }
  const testResult = { testId, testerId, timestamp, temperature, report, result };
  try {
    const contract = await getContractByRole(req.role);
    await contract.submitTransaction('AddTestResult', batchId, JSON.stringify(testResult));
    res.json({ message: 'Test result added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 6. 添加加工记录（加工商权限）
app.post('/api/batch/:id/process', checkRolePermission('addProcess'), async (req, res) => {
  const batchId = req.params.id;
  const { step, operator } = req.body;
  if (!step || !operator) {
    return res.status(400).json({ error: 'Missing step or operator' });
  }
  try {
    const contract = await getContractByRole(req.role);
    await contract.submitTransaction('AddProcessingRecord', batchId, step, operator);
    res.json({ message: 'Processing record added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 7. 创建产品（加工商权限）
app.post('/api/product', checkRolePermission('createProduct'), async (req, res) => {
  const { productId, batchId, packageDate, owner } = req.body;
  if (!productId || !batchId || !packageDate || !owner) {
    return res.status(400).json({ error: 'Missing required product fields' });
  }
  try {
    const contract = await getContractByRole(req.role);
    await contract.submitTransaction('CreateProduct', productId, batchId, packageDate, owner);
    res.json({ message: 'Product created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 8. 查询产品及其批次信息（消费者权限）
app.get('/api/product/:id', checkRolePermission('getProduct'), async (req, res) => {
  const productId = req.params.id;
  try {
    const contract = await getContractByRole(req.role);
    const resultBytes = await contract.evaluateTransaction('ReadProduct', productId);
    const resultJson = utf8Decoder.decode(resultBytes);
    res.json(JSON.parse(resultJson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 9. 判断批次是否存在（所有有权限用户都可）
app.get('/api/batch/:id/exists', checkRolePermission('getAll'), async (req, res) => {
  const batchId = req.params.id;
  try {
    const contract = await getContractByRole(req.role);
    const existsBytes = await contract.evaluateTransaction('RiceBatchExists', batchId);
    const existsStr = utf8Decoder.decode(existsBytes);
    res.json({ exists: existsStr === 'true' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`REST API server listening at http://localhost:${PORT}`);
});