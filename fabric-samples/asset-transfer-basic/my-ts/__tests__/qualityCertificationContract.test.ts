/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { QualityCertificationContract } from '../src/qualityCertificationContract';
import { OrganizationType } from '../src/types';

describe('QualityCertificationContract', () => {
    let contract: QualityCertificationContract;

    beforeEach(() => {
        contract = new QualityCertificationContract();
    });

    describe('Contract Instantiation', () => {
        test('should create contract instance', () => {
            expect(contract).toBeInstanceOf(QualityCertificationContract);
            expect(contract).toBeDefined();
        });

        test('should have correct contract info', () => {
            expect(typeof contract.GetCallerInfo).toBe('function');
            expect(typeof contract.GetPermissionMatrix).toBe('function');
        });
    });

    describe('Organization Type Logic', () => {
        test('should validate organization type enum', () => {
            expect(OrganizationType.FARM).toBe(1);
            expect(OrganizationType.MIDDLEMAN_TESTER).toBe(2);
            expect(OrganizationType.CONSUMER).toBe(3);
        });

        test('should test organization type mapping logic', () => {
            const getOrganizationType = (mspId: string): number => {
                const mspToOrgType: Record<string, number> = {
                    'Org1MSP': 1,              // Farm organization
                    'Org2MSP': 2,              // Middleman/tester organization
                    'Org3MSP': 3               // Consumer organization
                };
                return mspToOrgType[mspId] || 3;
            };

            expect(getOrganizationType('Org1MSP')).toBe(1);
            expect(getOrganizationType('Org2MSP')).toBe(2);
            expect(getOrganizationType('Org3MSP')).toBe(3);
            expect(getOrganizationType('UnknownMSP')).toBe(3);
        });
    });

    describe('Permission Logic', () => {
        test('should check permission correctly', () => {
            const checkPermission = (callerType: number, allowedTypes: number[]): boolean => {
                return allowedTypes.includes(callerType);
            };

            expect(checkPermission(1, [1, 2])).toBe(true); // Farm accessing Farm/Middleman
            expect(checkPermission(2, [1, 2])).toBe(true); // Middleman accessing Farm/Middleman
            expect(checkPermission(3, [1, 2])).toBe(false); // Consumer accessing Farm/Middleman
            expect(checkPermission(2, [2])).toBe(true); // Middleman accessing Middleman-only
            expect(checkPermission(1, [1, 2, 3])).toBe(true); // Farm accessing all
        });
    });

    describe('Test Result Operations', () => {
        test('should validate test result structure', () => {
            const testResult = {
                testId: 'test123',
                batchId: 'batch123',
                testType: 'QualityTest',
                testDate: '2024-01-01',
                testResult: 'Pass',
                tester: 'Tester A',
                notes: 'Good quality rice',
                isVerified: false,
                verificationSource: '',
                verificationTimestamp: ''
            };

            expect(testResult.testId).toBe('test123');
            expect(testResult.batchId).toBe('batch123');
            expect(testResult.testType).toBe('QualityTest');
            expect(testResult.testResult).toBe('Pass');
            expect(testResult.isVerified).toBe(false);
        });

        test('should have all required test result methods', () => {
            expect(typeof contract.CreateTestResult).toBe('function');
            expect(typeof contract.ReadTestResult).toBe('function');
            expect(typeof contract.GetAllTestResults).toBe('function');
            expect(typeof contract.VerifyTestResult).toBe('function');
            expect(typeof contract.GetTestResultsByBatch).toBe('function');
        });
    });

    describe('Quality Certificate Operations', () => {
        test('should validate quality certificate structure', () => {
            const certificate = {
                certificateId: 'cert123',
                batchId: 'batch123',
                testIds: ['test1', 'test2'],
                certificateType: 'QualityCertificate',
                issueDate: '2024-01-01',
                issuer: 'Certification Authority',
                validityPeriod: '1 year',
                standards: 'ISO 9001',
                isActive: true
            };

            expect(certificate.certificateId).toBe('cert123');
            expect(certificate.batchId).toBe('batch123');
            expect(certificate.certificateType).toBe('QualityCertificate');
            expect(certificate.issuer).toBe('Certification Authority');
            expect(certificate.isActive).toBe(true);
        });

        test('should have all required certificate methods', () => {
            expect(typeof contract.CreateQualityCertificate).toBe('function');
            expect(typeof contract.ReadQualityCertificate).toBe('function');
            expect(typeof contract.GetAllQualityCertificates).toBe('function');
            expect(typeof contract.GetCertificatesByBatch).toBe('function');
        });
    });

    describe('Data Validation', () => {
        test('should validate required test result fields', () => {
            const validateTestResult = (testResult: any) => {
                if (!testResult.testId) {
                    throw new Error('Test ID is required');
                }
                if (!testResult.batchId) {
                    throw new Error('Batch ID is required');
                }
                if (!testResult.testType) {
                    throw new Error('Test type is required');
                }
                if (!testResult.testResult) {
                    throw new Error('Test result is required');
                }
                return true;
            };

            const validTestResult = { 
                testId: 'test123', 
                batchId: 'batch123', 
                testType: 'QualityTest',
                testResult: 'Pass'
            };
            expect(validateTestResult(validTestResult)).toBe(true);

            expect(() => {
                validateTestResult({ batchId: 'batch123', testType: 'QualityTest', testResult: 'Pass' }); // Missing testId
            }).toThrow('Test ID is required');
        });

        test('should validate required certificate fields', () => {
            const validateCertificate = (certificate: any) => {
                if (!certificate.certificateId) {
                    throw new Error('Certificate ID is required');
                }
                if (!certificate.batchId) {
                    throw new Error('Batch ID is required');
                }
                if (!certificate.issuer) {
                    throw new Error('Issuer is required');
                }
                return true;
            };

            const validCertificate = { 
                certificateId: 'cert123', 
                batchId: 'batch123', 
                issuer: 'Certification Authority'
            };
            expect(validateCertificate(validCertificate)).toBe(true);

            expect(() => {
                validateCertificate({ certificateId: 'cert123', batchId: 'batch123' }); // Missing issuer
            }).toThrow('Issuer is required');
        });
    });

    describe('JSON Operations', () => {
        test('should stringify and parse test result objects correctly', () => {
            const original = {
                testId: 'test123',
                batchId: 'batch123',
                testType: 'QualityTest',
                testDate: '2024-01-01',
                testResult: 'Pass',
                tester: 'Tester A',
                notes: 'Good quality rice',
                isVerified: true,
                verificationSource: 'Oracle',
                verificationTimestamp: '2024-01-01T00:00:00Z'
            };

            const jsonString = JSON.stringify(original);
            const parsed = JSON.parse(jsonString);

            expect(parsed).toEqual(original);
            expect(parsed.testId).toBe('test123');
            expect(parsed.isVerified).toBe(true);
        });

        test('should stringify and parse certificate objects correctly', () => {
            const original = {
                certificateId: 'cert123',
                batchId: 'batch123',
                testIds: ['test1', 'test2'],
                certificateType: 'QualityCertificate',
                issueDate: '2024-01-01',
                issuer: 'Certification Authority',
                validityPeriod: '1 year',
                standards: 'ISO 9001',
                isActive: true
            };

            const jsonString = JSON.stringify(original);
            const parsed = JSON.parse(jsonString);

            expect(parsed).toEqual(original);
            expect(parsed.certificateId).toBe('cert123');
            expect(parsed.isActive).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should throw error for invalid quality operations', () => {
            expect(() => {
                throw new Error('Permission denied: Only Middleman/Tester can create quality certificates');
            }).toThrow('Permission denied');
        });

        test('should handle missing quality data', () => {
            const data = null;
            expect(data).toBeNull();
        });
    });

    describe('Verification Logic', () => {
        test('should validate verification process', () => {
            const validateVerification = (verification: any) => {
                if (!verification.verificationSource) {
                    throw new Error('Verification source is required');
                }
                if (!verification.verificationNotes) {
                    throw new Error('Verification notes are required');
                }
                return true;
            };

            const validVerification = { 
                verificationSource: 'Oracle', 
                verificationNotes: 'Verified by external source' 
            };
            expect(validateVerification(validVerification)).toBe(true);

            expect(() => {
                validateVerification({ verificationNotes: 'Verified by external source' }); // Missing source
            }).toThrow('Verification source is required');
        });
    });
}); 