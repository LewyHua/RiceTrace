const path = require('node:path');

/**
 * 大米供应链追溯系统配置文件
 * 统一管理所有环境配置和组织信息
 */

// 基础环境配置
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// Hyperledger Fabric 网络配置
const fabric = {
  channelName: process.env.CHANNEL_NAME || 'channel1',
  chaincodeName: process.env.CHAINCODE_NAME || 'basic',
  
  // 网络超时配置
  timeouts: {
    evaluate: 5000,     // 5秒
    endorse: 15000,     // 15秒
    submit: 5000,       // 5秒
    commitStatus: 60000 // 60秒
  }
};

// 组织角色配置映射
const organizations = {
  farmer: {
    role: 'farmer',
    org: 'org1.example.com',
    mspId: 'Org1MSP',
    peerPort: '7051',
    peerEndpoint: 'localhost:7051',
    description: '农户组织 - 负责创建批次、初期加工、转移'
  },
  processor: {
    role: 'processor',
    org: 'org2.example.com',
    mspId: 'Org2MSP',
    peerPort: '9051',
    peerEndpoint: 'localhost:9051',
    description: '加工商组织 - 负责质检、深加工、产品包装、转移'
  },
  consumer: {
    role: 'consumer',
    org: 'org3.example.com',
    mspId: 'Org3MSP',
    peerPort: '11051',
    peerEndpoint: 'localhost:11051',
    description: '消费者/监管组织 - 查看追溯信息'
  }
};

// 角色权限配置
const permissions = {
  farmer: ['getAll', 'create', 'getById'],
  processor: ['transfer', 'addTest', 'addProcess', 'createProduct', 'getById'],
  consumer: ['getById', 'getProduct', 'getAll']
};

// 路径配置工厂函数
function getPaths(orgConfig) {
  const testNetworkPath = path.resolve(__dirname, '..', '..', 'test-network');
  const cryptoPath = path.resolve(testNetworkPath, 'organizations', 'peerOrganizations', orgConfig.org);
  
  return {
    cryptoPath,
    certDirectoryPath: path.resolve(cryptoPath, 'users', `User1@${orgConfig.org}`, 'msp', 'signcerts'),
    keyDirectoryPath: path.resolve(cryptoPath, 'users', `User1@${orgConfig.org}`, 'msp', 'keystore'),
    tlsCertPath: path.resolve(cryptoPath, 'peers', `peer0.${orgConfig.org}`, 'tls', 'ca.crt'),
    peerHostAlias: `peer0.${orgConfig.org}`
  };
}

// Oracle 服务配置
const oracleServices = {
  foodSafety: {
    baseUrl: process.env.FOOD_SAFETY_API_URL || 'https://api.mock-food-safety.gov/v1',
    apiKey: process.env.FOOD_SAFETY_API_KEY || 'mock-api-key',
    timeout: 10000, // 10秒超时
    retryCount: 3   // 重试次数
  }
};

// Supabase 配置（预留，待实现）
const supabase = {
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  buckets: {
    testReports: 'test-reports',
    documents: 'documents',
    images: 'images'
  }
};

// 错误代码配置
const errorCodes = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ROLE_MISSING: 'ROLE_MISSING',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FABRIC_ERROR: 'FABRIC_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  ORACLE_ERROR: 'ORACLE_ERROR',
  ORACLE_VERIFICATION_FAILED: 'ORACLE_VERIFICATION_FAILED'
};

// 验证配置
function validateConfig() {
  const requiredRoles = ['farmer', 'processor', 'consumer'];
  for (const role of requiredRoles) {
    if (!organizations[role]) {
      throw new Error(`Missing configuration for role: ${role}`);
    }
    if (!permissions[role]) {
      throw new Error(`Missing permissions for role: ${role}`);
    }
  }
  
  console.log('✅ Configuration validation passed');
}

// 获取角色配置
function getRoleConfig(role) {
  const orgConfig = organizations[role];
  if (!orgConfig) {
    throw new Error(`Unknown role: ${role}. Available roles: ${Object.keys(organizations).join(', ')}`);
  }
  
  return {
    ...orgConfig,
    paths: getPaths(orgConfig),
    permissions: permissions[role] || []
  };
}

// 获取所有可用角色
function getAvailableRoles() {
  return Object.keys(organizations);
}

// 检查角色是否有权限
function hasPermission(role, permission) {
  const rolePermissions = permissions[role];
  return rolePermissions && rolePermissions.includes(permission);
}

module.exports = {
  env,
  fabric,
  organizations,
  permissions,
  oracleServices,
  supabase,
  errorCodes,
  
  // 工具函数
  validateConfig,
  getRoleConfig,
  getAvailableRoles,
  hasPermission,
  getPaths
}; 