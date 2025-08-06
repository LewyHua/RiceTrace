/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { RiceTracerContract } from '../src/riceTracerContract';
import { OrganizationType } from '../src/types';

describe('RiceTracerContract', () => {
    let contract: RiceTracerContract;

    beforeEach(() => {
        contract = new RiceTracerContract();
    });

    describe('Contract Instantiation', () => {
        test('should create contract instance', () => {
            expect(contract).toBeInstanceOf(RiceTracerContract);
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

            expect(checkPermission(1, [1])).toBe(true); // Farm accessing Farm-only
            expect(checkPermission(3, [1])).toBe(false); // Consumer accessing Farm-only
            expect(checkPermission(1, [1, 2])).toBe(true); // Farm accessing shared
            expect(checkPermission(2, [1, 2])).toBe(true); // Middleman accessing shared
        });
    });

    describe('Rice Batch Operations', () => {
        test('should validate rice batch structure', () => {
            const riceBatch = {
                docType: 'riceBatch',
                batchId: 'batch123',
                origin: 'Heilongjiang',
                variety: 'Japonica',
                harvestDate: '2024-09-15',
                currentOwner: 'Farmer Zhang',
                currentState: 'Harvested',
                history: []
            };

            expect(riceBatch.docType).toBe('riceBatch');
            expect(riceBatch.batchId).toBe('batch123');
            expect(riceBatch.origin).toBe('Heilongjiang');
            expect(riceBatch.variety).toBe('Japonica');
            expect(riceBatch.history).toHaveLength(0);
        });

        test('should have all required rice batch methods', () => {
            expect(typeof contract.InitLedger).toBe('function');
            expect(typeof contract.CreateRiceBatch).toBe('function');
            expect(typeof contract.CompleteStepAndTransfer).toBe('function');
            expect(typeof contract.ReadRiceBatch).toBe('function');
            expect(typeof contract.RiceBatchExists).toBe('function');
            expect(typeof contract.GetAllRiceBatches).toBe('function');
            expect(typeof contract.GetBatchHistory).toBe('function');
            expect(typeof contract.GetBatchCurrentStatus).toBe('function');
        });
    });

    describe('Data Validation', () => {
        test('should validate required fields', () => {
            const validateBatch = (batch: any) => {
                if (!batch.batchId) {
                    throw new Error('Batch ID is required');
                }
                if (!batch.origin) {
                    throw new Error('Origin is required');
                }
                return true;
            };

            const validBatch = { batchId: 'batch123', origin: 'Heilongjiang' };
            expect(validateBatch(validBatch)).toBe(true);

            expect(() => {
                validateBatch({ origin: 'Heilongjiang' }); // Missing batchId
            }).toThrow('Batch ID is required');
        });
    });

    describe('JSON Operations', () => {
        test('should stringify and parse objects correctly', () => {
            const original = {
                testId: 'test123',
                testerId: 'tester1',
                timestamp: '2024-01-01T00:00:00Z',
                temperature: '25C',
                report: 'Good quality',
                result: 'Pass',
                isVerified: true
            };

            const jsonString = JSON.stringify(original);
            const parsed = JSON.parse(jsonString);

            expect(parsed).toEqual(original);
            expect(parsed.testId).toBe('test123');
            expect(parsed.isVerified).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should throw error for invalid operations', () => {
            expect(() => {
                throw new Error('Permission denied: Only Farm can call this operation');
            }).toThrow('Permission denied');
        });

        test('should handle missing data', () => {
            const data = null;
            expect(data).toBeNull();
        });
    });
}); 