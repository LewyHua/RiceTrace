// fabricClient.js

const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');

const roleConfig = {
    farmer:  { org: 'org1.example.com', mspId: 'Org1MSP', peerPort: '7051' },
    processor: { org: 'org2.example.com', mspId: 'Org2MSP', peerPort: '9051' },
    consumer:  { org: 'org3.example.com', mspId: 'Org3MSP', peerPort: '11051' }
};

const channelName = 'channel1';
const chaincodeName = 'basic';

async function getContractByRole(role) {
    if (!roleConfig[role]) throw new Error(`Unknown role: ${role}`);
    const { org, mspId, peerPort } = roleConfig[role];

    const cryptoPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', org);
    const certDirectoryPath = path.resolve(cryptoPath, 'users', `User1@${org}`, 'msp', 'signcerts');
    const keyDirectoryPath = path.resolve(cryptoPath, 'users', `User1@${org}`, 'msp', 'keystore');
    const tlsCertPath = path.resolve(cryptoPath, 'peers', `peer0.${org}`, 'tls', 'ca.crt');
    const peerEndpoint = `localhost:${peerPort}`;
    const peerHostAlias = `peer0.${org}`;

    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    const client = new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });

    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);

    const gateway = connect({
        client,
        identity: { mspId, credentials },
        signer: signers.newPrivateKeySigner(privateKey),
        hash: hash.sha256,
        evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
        endorseOptions: () => ({ deadline: Date.now() + 15000 }),
        submitOptions: () => ({ deadline: Date.now() + 5000 }),
        commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });

    const network = gateway.getNetwork(channelName);
    return network.getContract(chaincodeName);
}

async function getFirstDirFileName(dirPath) {
    const files = await fs.readdir(dirPath);
    if (!files.length) throw new Error(`No files found in directory ${dirPath}`);
    return path.join(dirPath, files[0]);
}

console.log('fabricClient loaded');
module.exports = { getContractByRole };