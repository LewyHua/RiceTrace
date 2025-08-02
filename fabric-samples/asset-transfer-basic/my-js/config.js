const path = require('node:path');

// Load environment variables
require('dotenv').config();

/**
 * Rice traceability system configuration file
 * Manage all environment configurations and organization information
 */

// Basic environment configuration
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// Hyperledger Fabric network configuration
const fabric = {
  channelName: process.env.CHANNEL_NAME || 'channel1',
  chaincodeName: process.env.CHAINCODE_NAME || 'basic',
  
  // Network timeout configuration
  timeouts: {
    evaluate: 5000,     // 5 seconds
    endorse: 15000,     // 15 seconds
    submit: 5000,       // 5 seconds
    commitStatus: 60000 // 60 seconds
  }
};

// Organization role configuration mapping
const organizations = {
  farmer: {
    role: 'farmer',
    org: 'org1.example.com',
    mspId: 'Org1MSP',
    peerPort: '7051',
    peerEndpoint: 'localhost:7051',
    description: 'Farmer organization - responsible for creating batches, initial processing, and transfer'
  },
  processor: {
    role: 'processor',
    org: 'org2.example.com',
    mspId: 'Org2MSP',
    peerPort: '9051',
    peerEndpoint: 'localhost:9051',
    description: 'Processor organization - responsible for quality inspection, deep processing, product packaging, and transfer'
  },
  consumer: {
    role: 'consumer',
    org: 'org3.example.com',
    mspId: 'Org3MSP',
    peerPort: '11051',
    peerEndpoint: 'localhost:11051',
    description: 'Consumer/regulatory organization - view traceability information'
  }
};

// Role permission configuration
const permissions = {
  farmer: ['getAll', 'create', 'getById'],
  processor: ['getAll', 'transfer', 'addTest', 'addProcess', 'createProduct', 'getById'],
  consumer: ['getAll', 'getById', 'getProduct'],
  admin: ['getAll', 'create', 'getById', 'transfer', 'addTest', 'addProcess', 'createProduct', 'getProduct']
};

// Path configuration factory function
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

// Oracle service configuration
const oracleServices = {
  foodSafety: {
    baseUrl: process.env.FOOD_SAFETY_API_URL || 'https://api.mock-food-safety.gov/v1',
    apiKey: process.env.FOOD_SAFETY_API_KEY || 'mock-api-key',
    timeout: 10000, // 10 seconds timeout
    retryCount: 3   // Retry count
  }
};

// Cloudflare R2 configuration (compatible with S3 API)
const cloudflareR2 = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  bucketName: process.env.CLOUDFLARE_BUCKET_NAME || 'ricetrace',
  region: 'auto', // R2 uses 'auto' region
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
};

// Supabase configuration
const supabase = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  // Use Transaction pooler to avoid free version connection limit
  poolingUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace('.supabase.co', '.pooler.supabase.com') : '',
  options: {
    auth: {
      persistSession: false // For server applications, disable session persistence
    },
    db: {
      schema: 'public'
    }
  }
};

// Error code configuration
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

// Validate configuration
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
  
  console.log('Configuration validation passed');
}

// Get role configuration
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

// Get all available roles
function getAvailableRoles() {
  return Object.keys(organizations);
}

// Check if role has permission
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
  cloudflareR2,
  supabase,
  errorCodes,
  
  // Utility functions
  validateConfig,
  getRoleConfig,
  getAvailableRoles,
  hasPermission,
  getPaths
}; 