const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const { fabric, getRoleConfig, errorCodes } = require('../../config');

/**
 * Fabric DAO 层
 * 负责管理与 Hyperledger Fabric 网络的所有连接和基础操作
 */
class FabricDAO {
  constructor() {
    this.connections = new Map(); // 缓存连接，避免重复创建
  }

  /**
   * 获取指定角色的合约实例
   * @param {string} role - 角色名称 (farmer, processor, consumer)
   * @returns {Promise<Contract>} Fabric 合约实例
   */
  async getContract(role) {
    try {
      // 检查是否已有缓存的连接
      if (this.connections.has(role)) {
        return this.connections.get(role);
      }

      const roleConfig = getRoleConfig(role);
      const contract = await this._createContract(roleConfig);
      
      // 缓存连接
      this.connections.set(role, contract);
      
      console.log(`✅ Fabric contract created for role: ${role}`);
      return contract;
    } catch (error) {
      console.error(`❌ Failed to create contract for role ${role}:`, error.message);
      throw new Error(`${errorCodes.FABRIC_ERROR}: Failed to connect to Fabric network: ${error.message}`);
    }
  }

  /**
   * 创建 Fabric 合约连接
   * @private
   */
  async _createContract(roleConfig) {
    const { paths, mspId, peerEndpoint, peerHostAlias } = roleConfig;

    // 创建 gRPC 客户端
    const client = await this._createGrpcClient(paths.tlsCertPath, peerEndpoint, peerHostAlias);
    
    // 创建身份和签名器
    const identity = await this._createIdentity(mspId, paths.certDirectoryPath);
    const signer = await this._createSigner(paths.keyDirectoryPath);

    // 建立网关连接
    const gateway = connect({
      client,
      identity,
      signer,
      hash: hash.sha256,
      evaluateOptions: () => ({ deadline: Date.now() + fabric.timeouts.evaluate }),
      endorseOptions: () => ({ deadline: Date.now() + fabric.timeouts.endorse }),
      submitOptions: () => ({ deadline: Date.now() + fabric.timeouts.submit }),
      commitStatusOptions: () => ({ deadline: Date.now() + fabric.timeouts.commitStatus }),
    });

    const network = gateway.getNetwork(fabric.channelName);
    return network.getContract(fabric.chaincodeName);
  }

  /**
   * 创建 gRPC 客户端
   * @private
   */
  async _createGrpcClient(tlsCertPath, peerEndpoint, peerHostAlias) {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    
    return new grpc.Client(peerEndpoint, tlsCredentials, {
      'grpc.ssl_target_name_override': peerHostAlias,
    });
  }

  /**
   * 创建身份
   * @private
   */
  async _createIdentity(mspId, certDirectoryPath) {
    const certPath = await this._getFirstFileInDirectory(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
  }

  /**
   * 创建签名器
   * @private
   */
  async _createSigner(keyDirectoryPath) {
    const keyPath = await this._getFirstFileInDirectory(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
  }

  /**
   * 获取目录中的第一个文件
   * @private
   */
  async _getFirstFileInDirectory(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      if (!files.length) {
        throw new Error(`No files found in directory: ${dirPath}`);
      }
      return path.join(dirPath, files[0]);
    } catch (error) {
      throw new Error(`Cannot access directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * 执行查询操作（只读）
   * @param {string} role - 角色
   * @param {string} method - 合约方法名
   * @param {...string} args - 方法参数
   * @returns {Promise<any>} 查询结果
   */
  async evaluateTransaction(role, method, ...args) {
    try {
      const contract = await this.getContract(role);
      const resultBytes = await contract.evaluateTransaction(method, ...args);
      const resultJson = new TextDecoder().decode(resultBytes);
      return JSON.parse(resultJson);
    } catch (error) {
      console.error(`❌ Evaluate transaction failed [${method}]:`, error.message);
      throw new Error(`${errorCodes.FABRIC_ERROR}: ${error.message}`);
    }
  }

  /**
   * 执行提交操作（写入）
   * @param {string} role - 角色
   * @param {string} method - 合约方法名
   * @param {...string} args - 方法参数
   * @returns {Promise<any>} 提交结果
   */
  async submitTransaction(role, method, ...args) {
    try {
      const contract = await this.getContract(role);
      const result = await contract.submitTransaction(method, ...args);
      console.log(`✅ Transaction submitted successfully: ${method}`);
      return result;
    } catch (error) {
      console.error(`❌ Submit transaction failed [${method}]:`, error.message);
      throw new Error(`${errorCodes.FABRIC_ERROR}: ${error.message}`);
    }
  }

  /**
   * 异步提交操作
   * @param {string} role - 角色
   * @param {string} method - 合约方法名
   * @param {Object} options - 提交选项
   * @returns {Promise<any>} 提交结果
   */
  async submitAsyncTransaction(role, method, options = {}) {
    try {
      const contract = await this.getContract(role);
      const commit = await contract.submitAsync(method, options);
      const result = new TextDecoder().decode(commit.getResult());
      
      // 等待交易确认
      const status = await commit.getStatus();
      if (!status.successful) {
        throw new Error(`Transaction ${status.transactionId} failed to commit`);
      }
      
      console.log(`✅ Async transaction committed successfully: ${method}`);
      return result;
    } catch (error) {
      console.error(`❌ Async submit transaction failed [${method}]:`, error.message);
      throw new Error(`${errorCodes.FABRIC_ERROR}: ${error.message}`);
    }
  }

  /**
   * 清理所有连接
   */
  async cleanup() {
    console.log('🧹 Cleaning up Fabric connections...');
    for (const [role, contract] of this.connections) {
      try {
        // 这里可以添加具体的清理逻辑，比如关闭gateway
        console.log(`Connection for ${role} cleaned up`);
      } catch (error) {
        console.error(`Error cleaning up connection for ${role}:`, error.message);
      }
    }
    this.connections.clear();
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return {
      totalConnections: this.connections.size,
      activeRoles: Array.from(this.connections.keys())
    };
  }
}

// 创建单例实例
const fabricDAO = new FabricDAO();

module.exports = fabricDAO; 