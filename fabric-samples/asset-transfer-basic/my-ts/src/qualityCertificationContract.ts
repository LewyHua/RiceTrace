/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import { TestResult, OrganizationType, OrganizationInfo, QualityCertificate } from './types';

@Info({ title: 'QualityCertificationContract', description: 'Smart contract for quality testing and certification operations' })
export class QualityCertificationContract extends Contract {

    /**
     * Get organization type based on MSP ID
     * Can be configured based on actual organization structure
     */
    private getOrganizationType(mspId: string): OrganizationType {
        // Map MSP ID to organization type
        // Can be modified based on actual organization structure
        const mspToOrgType: Record<string, OrganizationType> = {
            'Org1MSP': OrganizationType.FARM,              // Farm organization
            'Org2MSP': OrganizationType.MIDDLEMAN_TESTER,  // Middleman/tester organization
            'Org3MSP': OrganizationType.CONSUMER           // Consumer organization
        };

        return mspToOrgType[mspId] || OrganizationType.CONSUMER;
    }

    /**
     * Check if the caller has permission to perform specific operations
     */
    private checkPermission(ctx: Context, allowedTypes: OrganizationType[]): void {
        const mspId = ctx.clientIdentity.getMSPID();
        const callerType = this.getOrganizationType(mspId);

        if (!allowedTypes.includes(callerType)) {
            const allowedNames = allowedTypes.map(type => {
                switch (type) {
                    case OrganizationType.FARM: return 'Farm';
                    case OrganizationType.MIDDLEMAN_TESTER: return 'Middleman/tester';
                    case OrganizationType.CONSUMER: return 'Consumer';
                    default: return 'Unknown';
                }
            }).join(', ');
            
            throw new Error(`Permission denied: Only the following organization types can call: ${allowedNames}`);
        }
    }

    /**
     * Get caller organization information
     */
    @Transaction(false)
    @Returns('OrganizationInfo')
    public async GetCallerInfo(ctx: Context): Promise<OrganizationInfo> {
        const mspId = ctx.clientIdentity.getMSPID();
        const orgType = this.getOrganizationType(mspId);
        
        return {
            orgId: mspId,
            orgType: orgType,
            orgName: mspId // Can be mapped to a more friendly name if needed
        };
    }

    /**
     * Get permission configuration for all methods
     */
    @Transaction(false)
    @Returns('string')
    public async GetPermissionMatrix(ctx: Context): Promise<string> {
        const permissionMatrix = {
            "QualityCertificationContract Method Permission Configuration": {
                "CreateTestResult": ["Farm", "Middleman/Tester"],
                "CreateQualityCertificate": ["Middleman/Tester"],
                "ReadTestResult": ["All Organizations"],
                "ReadQualityCertificate": ["All Organizations"],
                "GetAllTestResults": ["All Organizations"],
                "GetAllQualityCertificates": ["All Organizations"],
                "VerifyTestResult": ["Middleman/Tester"],
                "GetCallerInfo": ["All Organizations"],
                "GetPermissionMatrix": ["All Organizations"]
            },
            "Organization Type Description": {
                "1": "Farm (FARM) - Responsible for creating batches and initial processing",
                "2": "Middleman/Tester (MIDDLEMAN_TESTER) - Responsible for quality testing, processing and packaging",
                "3": "Consumer (CONSUMER) - Can only view information"
            }
        };
        
        return JSON.stringify(permissionMatrix, null, 2);
    }

    /**
     * Create test result
     * Permission: Farm and middleman/tester can call
     */
    @Transaction()
    public async CreateTestResult(
        ctx: Context,
        testId: string,
        batchId: string,
        testType: string,
        testDate: string,
        testResult: string,
        tester: string,
        notes: string
    ): Promise<void> {
        // Check permission: Farm and middleman/tester can create test results
        this.checkPermission(ctx, [OrganizationType.FARM, OrganizationType.MIDDLEMAN_TESTER]);

        const existingTest = await ctx.stub.getState(`test_${testId}`);
        if (existingTest && existingTest.length > 0) {
            throw new Error(`Test result ${testId} already exists`);
        }

        // Get transaction timestamp
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const testResultObj: TestResult = {
            docType: 'testResult',
            testId,
            batchId,
            testType,
            testDate,
            testResult,
            tester,
            notes,
            isVerified: false,
            verificationSource: '',
            verificationTimestamp: '',
            reportHash: `hash_${testId}_${now}`,
            reportId: testId,
            testerId: '',
            timestamp: '',
            temperature: '',
            report: '',
            result: ''
        };

        await ctx.stub.putState(
            `test_${testId}`,
            Buffer.from(stringify(sortKeysRecursive(testResultObj)))
        );
    }

    /**
     * Create quality certificate
     * Permission: Only middleman/tester can call
     */
    @Transaction()
    public async CreateQualityCertificate(
        ctx: Context,
        certificateId: string,
        batchId: string,
        testIds: string,
        certificateType: string,
        issueDate: string,
        issuer: string,
        validityPeriod: string,
        standards: string
    ): Promise<void> {
        // Check permission: Only middleman/tester can create quality certificates
        this.checkPermission(ctx, [OrganizationType.MIDDLEMAN_TESTER]);

        const existingCert = await ctx.stub.getState(`cert_${certificateId}`);
        if (existingCert && existingCert.length > 0) {
            throw new Error(`Quality certificate ${certificateId} already exists`);
        }

        // Get transaction timestamp
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const certificate: QualityCertificate = {
            docType: 'qualityCertificate',
            certificateId,
            batchId,
            testIds: testIds.split(','),
            certificateType,
            issueDate,
            issuer,
            validityPeriod,
            standards,
            isActive: true,
            createdTimestamp: now,
            lastUpdated: now
        };

        await ctx.stub.putState(
            `cert_${certificateId}`,
            Buffer.from(stringify(sortKeysRecursive(certificate)))
        );
    }

    /**
     * Read test result
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('TestResult')
    public async ReadTestResult(ctx: Context, testId: string): Promise<TestResult> {
        const testJSON = await ctx.stub.getState(`test_${testId}`);
        if (!testJSON || testJSON.length === 0) {
            throw new Error(`Test result ${testId} does not exist`);
        }

        return JSON.parse(testJSON.toString());
    }

    /**
     * Read quality certificate
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('QualityCertificate')
    public async ReadQualityCertificate(ctx: Context, certificateId: string): Promise<QualityCertificate> {
        const certJSON = await ctx.stub.getState(`cert_${certificateId}`);
        if (!certJSON || certJSON.length === 0) {
            throw new Error(`Quality certificate ${certificateId} does not exist`);
        }

        return JSON.parse(certJSON.toString());
    }

    /**
     * Get all test results
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('TestResult[]')
    public async GetAllTestResults(ctx: Context): Promise<TestResult[]> {
        const resultsIterator = await ctx.stub.getStateByRange('test_', 'test_\uffff');
        const testResults: TestResult[] = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                try {
                    const testResult: TestResult = JSON.parse(result.value.value.toString());
                    if (testResult.testId) {
                        testResults.push(testResult);
                    }
                } catch (error) {
                    // Skip invalid data
                    console.warn(`Skipping invalid test result data: ${error}`);
                }
            }
            result = await resultsIterator.next();
        }

        await resultsIterator.close();
        return testResults;
    }

    /**
     * Get all quality certificates
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('QualityCertificate[]')
    public async GetAllQualityCertificates(ctx: Context): Promise<QualityCertificate[]> {
        const resultsIterator = await ctx.stub.getStateByRange('cert_', 'cert_\uffff');
        const certificates: QualityCertificate[] = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                try {
                    const certificate: QualityCertificate = JSON.parse(result.value.value.toString());
                    if (certificate.certificateId) {
                        certificates.push(certificate);
                    }
                } catch (error) {
                    // Skip invalid data
                    console.warn(`Skipping invalid certificate data: ${error}`);
                }
            }
            result = await resultsIterator.next();
        }

        await resultsIterator.close();
        return certificates;
    }

    /**
     * Verify test result
     * Permission: Only middleman/tester can call
     */
    @Transaction()
    public async VerifyTestResult(
        ctx: Context,
        testId: string,
        verificationSource: string,
        verificationNotes: string
    ): Promise<void> {
        // Check permission: Only middleman/tester can verify test results
        this.checkPermission(ctx, [OrganizationType.MIDDLEMAN_TESTER]);

        const testResult = await this.ReadTestResult(ctx, testId);

        // Get transaction timestamp
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        // Update verification information
        testResult.isVerified = true;
        testResult.verificationSource = verificationSource;
        testResult.verificationTimestamp = now;
        testResult.notes = testResult.notes ? `${testResult.notes}; Verification: ${verificationNotes}` : `Verification: ${verificationNotes}`;

        await ctx.stub.putState(
            `test_${testId}`,
            Buffer.from(stringify(sortKeysRecursive(testResult)))
        );
    }

    /**
     * Get test results by batch ID
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('TestResult[]')
    public async GetTestResultsByBatch(ctx: Context, batchId: string): Promise<TestResult[]> {
        const allTests = await this.GetAllTestResults(ctx);
        return allTests.filter(test => test.batchId === batchId);
    }

    /**
     * Get quality certificates by batch ID
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('QualityCertificate[]')
    public async GetCertificatesByBatch(ctx: Context, batchId: string): Promise<QualityCertificate[]> {
        const allCerts = await this.GetAllQualityCertificates(ctx);
        return allCerts.filter(cert => cert.batchId === batchId);
    }
} 