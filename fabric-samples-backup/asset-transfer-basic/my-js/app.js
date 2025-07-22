/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');

// 获取角色（农户、加工商、消费者）
const role = process.argv.includes('--role')
    ? process.argv[process.argv.indexOf('--role') + 1]
    : 'farmer'; // 默认farmer

// 角色和 org 的映射
const roleConfig = {
    farmer:  { org: 'org1.example.com', mspId: 'Org1MSP', peerPort: '7051' },
    processor: { org: 'org2.example.com', mspId: 'Org2MSP', peerPort: '9051' },
    consumer:  { org: 'org3.example.com', mspId: 'Org3MSP', peerPort: '11051' }
};

if (!roleConfig[role]) {
    console.error(`Unknown role: ${role}. Must be one of farmer | processor | consumer`);
    process.exit(1);
}

const { org, mspId, peerPort } = roleConfig[role];

const channelName = envOrDefault('CHANNEL_NAME', 'channel1');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');

// Path to crypto materials.
const cryptoPath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'test-network',
    'organizations',
    'peerOrganizations',
    org
);

// Path to user private key directory.
const keyDirectoryPath = path.resolve(
    cryptoPath,
    'users',
    `User1@${org}`,
    'msp',
    'keystore'
);

// Path to user certificate directory.
const certDirectoryPath = path.resolve(
    cryptoPath,
    'users',
    `User1@${org}`,
    'msp',
    'signcerts'
);

// Path to peer tls certificate.
const tlsCertPath = path.resolve(
    cryptoPath,
    'peers',
    `peer0.${org}`,
    'tls',
    'ca.crt'
);

// Gateway peer endpoint.
const peerEndpoint = `localhost:${peerPort}`;

// Gateway peer SSL host name override.
const peerHostAlias = `peer0.${org}`;

const utf8Decoder = new TextDecoder();
const batchId = `batch${String(Date.now())}`;

async function main() {
    displayInputParameters();

    const client = await newGrpcConnection();

    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        hash: hash.sha256,
        evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
        endorseOptions: () => ({ deadline: Date.now() + 15000 }),
        submitOptions: () => ({ deadline: Date.now() + 5000 }),
        commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });

    try {
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        // 根据角色执行不同的功能
        if (role === 'farmer') {
            await initLedger(contract);
            await getAllRiceBatches(contract);
            await createRiceBatch(contract);
        } else if (role === 'processor') {
            await transferRiceBatchAsync(contract);
        } else if (role === 'consumer') {
            await readRiceBatchByID(contract);
        }
    } finally {
        gateway.close();
        client.close();
    }
}

main().catch((error) => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});

async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function getFirstDirFileName(dirPath) {
    const files = await fs.readdir(dirPath);
    const file = files[0];
    if (!file) {
        throw new Error(`No files in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
}

async function newSigner() {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

// ============ 自定义函数 ============

async function initLedger(contract) {
    console.log('\n--> Submit Transaction: InitLedger (初始化批次)');
    await contract.submitTransaction('InitLedger');
    console.log('*** Transaction committed successfully');
}

async function getAllRiceBatches(contract) {
    console.log('\n--> Evaluate Transaction: GetAllRiceBatches (查询所有批次)');
    const resultBytes = await contract.evaluateTransaction('GetAllRiceBatches');
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', result);
}

async function createRiceBatch(contract) {
    console.log('\n--> Submit Transaction: CreateRiceBatch (新增批次)');
    await contract.submitTransaction(
        'CreateRiceBatch',
        batchId,
        'Heilongjiang',
        'Japonica',
        '2024-09-30',
        'Passed',
        'Farmer Wang',
        'Harvested'
    );
    console.log('*** Transaction committed successfully');
}

async function transferRiceBatchAsync(contract) {
    console.log('\n--> Async Submit Transaction: TransferRiceBatch (转移批次所有者)');
    const commit = await contract.submitAsync('TransferRiceBatch', {
        arguments: [batchId, 'Warehouse A'],
    });
    const oldOwner = utf8Decoder.decode(commit.getResult());
    console.log(`*** Ownership transferred from ${oldOwner} to Warehouse A`);
    const status = await commit.getStatus();
    if (!status.successful) {
        throw new Error(`Transaction ${status.transactionId} failed to commit`);
    }
    console.log('*** Transaction committed successfully');
}

async function readRiceBatchByID(contract) {
    console.log('\n--> Evaluate Transaction: ReadRiceBatch (查询单个批次)');
    const resultBytes = await contract.evaluateTransaction('ReadRiceBatch', batchId);
    const resultJson = utf8Decoder.decode(resultBytes);
    const result = JSON.parse(resultJson);
    console.log('*** Result:', result);
}

// ============ 工具函数 ============
function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}

function displayInputParameters() {
    console.log(`role:              ${role}`);
    console.log(`channelName:       ${channelName}`);
    console.log(`chaincodeName:     ${chaincodeName}`);
    console.log(`mspId:             ${mspId}`);
    console.log(`cryptoPath:        ${cryptoPath}`);
    console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
    console.log(`certDirectoryPath: ${certDirectoryPath}`);
    console.log(`tlsCertPath:       ${tlsCertPath}`);
    console.log(`peerEndpoint:      ${peerEndpoint}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
}