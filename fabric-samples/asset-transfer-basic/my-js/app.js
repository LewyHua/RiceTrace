/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const { getAvailableRoles } = require('./config');

// Get role (farmer, processor, consumer)
const role = process.argv.includes('--role')
    ? process.argv[process.argv.indexOf('--role') + 1]
    : 'farmer'; // Default: farmer

if (!getAvailableRoles().includes(role)) {
    console.error(`Unknown role: ${role}. Must be one of ${getAvailableRoles().join(' | ')}`);
    process.exit(1);
}

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

/**
 * Simplified API test client
 * Test system functionality through REST API, not directly connecting to Fabric
 */

async function apiRequest(method, endpoint, data = null) {
    const url = `${API_BASE}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-User-Role': role
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        console.log(`${method} ${url}`);
        const response = await fetch(url);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`API Error: ${result.message || result.error}`);
        }
        
        console.log('Response:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Request failed:', error.message);
        throw error;
    }
}

async function testFarmerFunctions() {
    console.log('\nTesting Farmer Functions...');
    
    try {
        // 1. Get all batches
        console.log('\n1. Getting all batches...');
        await apiRequest('GET', '/batch');
        
        // 2. Create new batch
        console.log('\n2. Creating new batch...');
        const batchData = {
            location: 'Heilongjiang',
            variety: 'Japonica',
            harvestDate: '2024-10-15',
            initialTestResult: {
                moisture: '14.5%',
                purity: '99.2%'
            },
            owner: 'Farmer Wang',
            initialStep: 'Harvested',
            operator: 'Wang'
        };
        
        const createResult = await apiRequest('POST', '/batch', batchData);
        const newBatchId = createResult.data?.batchId;
        
        if (newBatchId) {
            // 3. Query new created batch
            console.log('\n3. Reading created batch...');
            await apiRequest('GET', `/batch/${newBatchId}`);
    }
        
    } catch (error) {
        console.error('Farmer test failed:', error.message);
    }
}

async function testProcessorFunctions() {
    console.log('\nTesting Processor Functions...');
    
    try {
        // 1. Get all batches
        console.log('\n1. Getting all batches...');
        const batchesResult = await apiRequest('GET', '/batch');
        
        if (batchesResult.data && batchesResult.data.length > 0) {
            const batchId = batchesResult.data[0].batchId;
            
            // 2. Add test result
            console.log('\n2. Adding test result...');
            const testData = {
                testId: `test_${Date.now()}`,
                testerId: 'Processor Lab',
                temperature: '25°C',
                report: 'Quality check passed',
                result: 'Passed'
            };
            await apiRequest('POST', `/batch/${batchId}/test`, testData);
            
            // 3. Add processing record
            console.log('\n3. Adding processing record...');
            const processData = {
                step: 'Cleaning and sorting',
                operator: 'Processor Team'
            };
            await apiRequest('POST', `/batch/${batchId}/process`, processData);
            
            // 4. Transfer ownership
            console.log('\n4. Transferring ownership...');
            const transferData = {
                newOwner: 'Warehouse A',
                operator: 'Logistics Manager'
            };
            await apiRequest('PUT', `/batch/${batchId}/transfer`, transferData);
}

    } catch (error) {
        console.error('Processor test failed:', error.message);
    }
}

async function testConsumerFunctions() {
    console.log('\nTesting Consumer Functions...');
    
    try {
        // 1. Get all batches
        console.log('\n1. Getting all batches...');
        const batchesResult = await apiRequest('GET', '/batch');
        
        if (batchesResult.data && batchesResult.data.length > 0) {
            const batchId = batchesResult.data[0].batchId;
            
            // 2. Query batch details
            console.log('\n2. Reading batch details...');
            await apiRequest('GET', `/batch/${batchId}`);
            
            // 3. Check if batch exists
            console.log('\n3. Checking if batch exists...');
            await apiRequest('GET', `/batch/${batchId}/exists`);
        }
        
    } catch (error) {
        console.error('Consumer test failed:', error.message);
    }
}

async function main() {
    console.log('Rice Traceability System API Test Client');
    console.log('=' .repeat(50));
    console.log(`API Base: ${API_BASE}`);
    console.log(`Role: ${role}`);
    console.log('=' .repeat(50));

    // Check if API is available
    try {
        console.log('\nChecking API health...');
        await apiRequest('GET', '/health');
    } catch (error) {
        console.error('API is not available. Please start the server first:');
        console.error('   npm start');
        process.exit(1);
}

    // Execute different tests based on role
    try {
        switch (role) {
            case 'farmer':
                await testFarmerFunctions();
                break;
            case 'processor':
                await testProcessorFunctions();
                break;
            case 'consumer':
                await testConsumerFunctions();
                break;
            default:
                console.error(`Unknown role: ${role}`);
                process.exit(1);
        }
        
        console.log('\nAll tests completed successfully!');
        
    } catch (error) {
        console.error('\nTest failed:', error.message);
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error('Application failed:', error);
    process.exitCode = 1;
});

// If fetch is not available (Node.js < 18), provide a simple implementation hint
if (typeof fetch === 'undefined') {
    console.error('This test client requires Node.js 18+ or install node-fetch');
    console.error('   Please upgrade Node.js or run: npm install node-fetch');
    process.exit(1);
}