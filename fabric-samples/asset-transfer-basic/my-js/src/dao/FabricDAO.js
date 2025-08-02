const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const { fabric, getRoleConfig, errorCodes } = require('../../config');

/**
 * Fabric DAO layer
 * Responsible for managing all connections and basic operations to the Hyperledger Fabric network
 */
class FabricDAO {
  constructor() {
    this.connections = new Map(); // Cache connections to avoid duplicate creation
  }

  /**
   * Get contract instance for a specific role
   * @param {string} role - Role name (farmer, processor, consumer)
   * @returns {Promise<Contract>} Fabric contract instance
   */
  async getContract(role) {
    try {
      // Check if there is a cached connection
      if (this.connections.has(role)) {
        return this.connections.get(role);
      }

      const roleConfig = getRoleConfig(role);
      const contract = await this._createContract(roleConfig);
      
      // Cache connection
      this.connections.set(role, contract);
      
      console.log(`Fabric contract created for role: ${role}`);
      return contract;
    } catch (error) {
      console.error(`Failed to create contract for role ${role}:`, error.message);
      throw new Error(`${errorCodes.FABRIC_ERROR}: Failed to connect to Fabric network: ${error.message}`);
    }
  }

  /**
   * Create Fabric contract connection
   * @private
   */
  async _createContract(roleConfig) {
    const { paths, mspId, peerEndpoint, peerHostAlias } = roleConfig;

    // Create gRPC client
    const client = await this._createGrpcClient(paths.tlsCertPath, peerEndpoint, peerHostAlias);
    
    // Create identity and signer
    const identity = await this._createIdentity(mspId, paths.certDirectoryPath);
    const signer = await this._createSigner(paths.keyDirectoryPath);

    // Establish gateway connection
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
   * Create gRPC client
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
   * Create identity
   * @private
   */
  async _createIdentity(mspId, certDirectoryPath) {
    const certPath = await this._getFirstFileInDirectory(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
  }

  /**
   * Create signer
   * @private
   */
  async _createSigner(keyDirectoryPath) {
    const keyPath = await this._getFirstFileInDirectory(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
  }

  /**
   * Get the first file in the directory
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
   * Execute query operation (read-only)
   * @param {string} role - Role
   * @param {string} method - Contract method name
   * @param {...string} args - Method parameters
   * @returns {Promise<any>} Query result
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
   * Execute submit operation (write)
   * @param {string} role - Role
   * @param {string} method - Contract method name
   * @param {...string} args - Method parameters
   * @returns {Promise<any>} Submit result
   */
  async submitTransaction(role, method, ...args) {
    try {
      const contract = await this.getContract(role);
      const result = await contract.submitTransaction(method, ...args);
      console.log(`Transaction submitted successfully: ${method}`);
      return result;
    } catch (error) {
      console.error(`Submit transaction failed [${method}]:`, error.message);
      throw new Error(`${errorCodes.FABRIC_ERROR}: ${error.message}`);
    }
  }

  /**
   * Asynchronous submit operation
   * @param {string} role - Role
   * @param {string} method - Contract method name
   * @param {Object} options - Submit options
   * @returns {Promise<any>} Submit result
   */
  async submitAsyncTransaction(role, method, options = {}) {
    try {
      const contract = await this.getContract(role);
      const commit = await contract.submitAsync(method, options);
      const result = new TextDecoder().decode(commit.getResult());
      
      // Wait for transaction confirmation
      const status = await commit.getStatus();
      if (!status.successful) {
        throw new Error(`Transaction ${status.transactionId} failed to commit`);
      }
      
      console.log(`Async transaction committed successfully: ${method}`);
      return result;
    } catch (error) {
      console.error(`Async submit transaction failed [${method}]:`, error.message);
      throw new Error(`${errorCodes.FABRIC_ERROR}: ${error.message}`);
    }
  }

  /**
   * Clean up all connections
   */
  async cleanup() {
    console.log('Cleaning up Fabric connections...');
    for (const [role, contract] of this.connections) {
      try {
        // Here you can add specific cleanup logic, such as closing the gateway
        console.log(`Connection for ${role} cleaned up`);
      } catch (error) {
        console.error(`Error cleaning up connection for ${role}:`, error.message);
      }
    }
    this.connections.clear();
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      totalConnections: this.connections.size,
      activeRoles: Array.from(this.connections.keys())
    };
  }
}

// Create singleton instance
const fabricDAO = new FabricDAO();

module.exports = fabricDAO; 