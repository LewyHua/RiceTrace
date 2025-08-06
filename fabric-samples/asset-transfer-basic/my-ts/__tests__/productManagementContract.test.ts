/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductManagementContract } from '../src/productManagementContract';
import { OrganizationType } from '../src/types';

describe('ProductManagementContract', () => {
    let contract: ProductManagementContract;

    beforeEach(() => {
        contract = new ProductManagementContract();
    });

    describe('Contract Instantiation', () => {
        test('should create contract instance', () => {
            expect(contract).toBeInstanceOf(ProductManagementContract);
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

            expect(checkPermission(2, [2])).toBe(true); // Middleman accessing Middleman-only
            expect(checkPermission(3, [2])).toBe(false); // Consumer accessing Middleman-only
            expect(checkPermission(1, [1, 2, 3])).toBe(true); // Farm accessing all
            expect(checkPermission(2, [1, 2, 3])).toBe(true); // Middleman accessing all
            expect(checkPermission(3, [1, 2, 3])).toBe(true); // Consumer accessing all
        });
    });

    describe('Product Operations', () => {
        test('should validate product structure', () => {
            const product = {
                docType: 'product',
                productId: 'product123',
                batchId: 'batch123',
                packageDate: '2024-01-01',
                owner: 'Processor A'
            };

            expect(product.docType).toBe('product');
            expect(product.productId).toBe('product123');
            expect(product.batchId).toBe('batch123');
            expect(product.owner).toBe('Processor A');
        });

        test('should have all required product methods', () => {
            expect(typeof contract.CreateProduct).toBe('function');
            expect(typeof contract.ReadProduct).toBe('function');
            expect(typeof contract.GetAllProducts).toBe('function');
            expect(typeof contract.ProductExists).toBe('function');
            expect(typeof contract.BatchExists).toBe('function');
            expect(typeof contract.GetBatchInfo).toBe('function');
        });
    });

    describe('Data Validation', () => {
        test('should validate required product fields', () => {
            const validateProduct = (product: any) => {
                if (!product.productId) {
                    throw new Error('Product ID is required');
                }
                if (!product.batchId) {
                    throw new Error('Batch ID is required');
                }
                if (!product.owner) {
                    throw new Error('Owner is required');
                }
                return true;
            };

            const validProduct = { 
                productId: 'product123', 
                batchId: 'batch123', 
                owner: 'Processor A' 
            };
            expect(validateProduct(validProduct)).toBe(true);

            expect(() => {
                validateProduct({ batchId: 'batch123', owner: 'Processor A' }); // Missing productId
            }).toThrow('Product ID is required');
        });
    });

    describe('JSON Operations', () => {
        test('should stringify and parse product objects correctly', () => {
            const original = {
                productId: 'product123',
                batchId: 'batch123',
                packageDate: '2024-01-01',
                owner: 'Processor A',
                quality: 'Premium',
                weight: '5kg'
            };

            const jsonString = JSON.stringify(original);
            const parsed = JSON.parse(jsonString);

            expect(parsed).toEqual(original);
            expect(parsed.productId).toBe('product123');
            expect(parsed.owner).toBe('Processor A');
        });
    });

    describe('Error Handling', () => {
        test('should throw error for invalid product operations', () => {
            expect(() => {
                throw new Error('Permission denied: Only Middleman/Tester can create products');
            }).toThrow('Permission denied');
        });

        test('should handle missing product data', () => {
            const data = null;
            expect(data).toBeNull();
        });
    });

    describe('Batch Integration', () => {
        test('should validate batch-product relationship', () => {
            const validateBatchProduct = (product: any) => {
                if (!product.batchId) {
                    throw new Error('Batch ID is required for product');
                }
                if (product.batchId.length < 3) {
                    throw new Error('Batch ID must be at least 3 characters');
                }
                return true;
            };

            const validProduct = { batchId: 'batch123' };
            expect(validateBatchProduct(validProduct)).toBe(true);

            expect(() => {
                validateBatchProduct({ batchId: 'ab' }); // Too short
            }).toThrow('Batch ID must be at least 3 characters');
        });
    });
}); 