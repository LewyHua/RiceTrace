/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import { Product, ProductWithBatch, OrganizationType, OrganizationInfo } from './types';

@Info({ title: 'ProductManagementContract', description: 'Smart contract for product management operations' })
export class ProductManagementContract extends Contract {

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
            "ProductManagementContract Method Permission Configuration": {
                "CreateProduct": ["Middleman/Tester"],
                "ReadProduct": ["All Organizations"],
                "GetAllProducts": ["All Organizations"],
                "ProductExists": ["All Organizations"],
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
     * Create product
     * Permission: Only middleman/tester can call
     */
    @Transaction()
    public async CreateProduct(
        ctx: Context,
        productId: string,
        batchId: string,
        packageDate: string,
        owner: string
    ): Promise<void> {
        // Check permission: Only middleman can create final product
        this.checkPermission(ctx, [OrganizationType.MIDDLEMAN_TESTER]);

        const existingProduct = await ctx.stub.getState(`product_${productId}`);
        if (existingProduct && existingProduct.length > 0) {
            throw new Error(`Product ${productId} already exists`);
        }

        // Check if batch exists (this would require cross-contract call in a real scenario)
        // For now, we'll assume the batch exists
        const batchExists = await this.BatchExists(ctx, batchId);
        if (!batchExists) {
            throw new Error(`Batch ${batchId} does not exist`);
        }

        const product: Product = {
            docType: 'product',
            productId,
            batchId,
            packageDate,
            owner
        };

        await ctx.stub.putState(
            `product_${productId}`,
            Buffer.from(stringify(sortKeysRecursive(product)))
        );
    }

    /**
     * Read product information (includes associated batch information)
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('ProductWithBatch')
    public async ReadProduct(ctx: Context, productId: string): Promise<ProductWithBatch> {
        const productJSON = await ctx.stub.getState(`product_${productId}`);
        if (!productJSON || productJSON.length === 0) {
            throw new Error(`Product ${productId} does not exist`);
        }

        const product: Product = JSON.parse(productJSON.toString());
        
        // Get batch information (this would require cross-contract call in a real scenario)
        // For now, we'll create a mock batch object
        const batch = await this.GetBatchInfo(ctx, product.batchId);

        return {
            product,
            batch
        };
    }

    /**
     * Get all products
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('Product[]')
    public async GetAllProducts(ctx: Context): Promise<Product[]> {
        const resultsIterator = await ctx.stub.getStateByRange('product_', 'product_\uffff');
        const products: Product[] = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                try {
                    const product: Product = JSON.parse(result.value.value.toString());
                    if (product.productId) {
                        products.push(product);
                    }
                } catch (error) {
                    // Skip invalid data
                    console.warn(`Skipping invalid product data: ${error}`);
                }
            }
            result = await resultsIterator.next();
        }

        await resultsIterator.close();
        return products;
    }

    /**
     * Check if product exists
     * Permission: No restriction
     */
    @Transaction(false)
    public async ProductExists(ctx: Context, productId: string): Promise<boolean> {
        const productJSON = await ctx.stub.getState(`product_${productId}`);
        return productJSON && productJSON.length > 0;
    }

    /**
     * Check if batch exists (helper method for cross-contract validation)
     * Permission: No restriction
     */
    @Transaction(false)
    public async BatchExists(ctx: Context, batchId: string): Promise<boolean> {
        const batchJSON = await ctx.stub.getState(`batch_${batchId}`);
        return batchJSON && batchJSON.length > 0;
    }

    /**
     * Get batch information (helper method for cross-contract data retrieval)
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('any')
    public async GetBatchInfo(ctx: Context, batchId: string): Promise<any> {
        const batchJSON = await ctx.stub.getState(`batch_${batchId}`);
        if (!batchJSON || batchJSON.length === 0) {
            throw new Error(`The rice batch ${batchId} does not exist`);
        }

        return JSON.parse(batchJSON.toString());
    }
} 