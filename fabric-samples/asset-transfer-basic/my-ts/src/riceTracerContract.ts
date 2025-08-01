/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import { RiceBatch, Product, ProductWithBatch, TestResult, OrganizationType, OrganizationInfo, HistoryEvent, ReportDetail } from './types';

@Info({ title: 'RiceTracerContract', description: 'Smart contract for rice traceability system' })
export class RiceTracerContract extends Contract {

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
            "Method Permission Configuration": {
                "InitLedger": ["Farm"],
                "CreateRiceBatch": ["Farm"], 
                "CompleteStepAndTransfer": ["Farm", "Middleman/Tester"],
                "CreateProduct": ["Middleman/Tester"],
                "ReadProduct": ["All Organizations"],
                "ReadRiceBatch": ["All Organizations"],
                "RiceBatchExists": ["All Organizations"],
                "GetAllRiceBatches": ["All Organizations"],
                "GetBatchHistory": ["All Organizations"],
                "GetBatchCurrentStatus": ["All Organizations"],
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
     * Initialize ledger data
     * Permission: Only farm can call
     */
    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        // Check permission: Only farm can initialize ledger
        this.checkPermission(ctx, [OrganizationType.FARM]);

        // Get transaction timestamp, ensure determinism
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const batches: RiceBatch[] = [
            {
                docType: 'riceBatch',
                batchId: 'batch1',
                origin: 'Heilongjiang',
                variety: 'Japonica',
                harvestDate: '2024-09-15',
                currentOwner: 'Farmer Zhang',
                currentState: 'Harvested',
                history: [
                    {
                        timestamp: now,
                        from: '',
                        to: 'Farmer Zhang',
                        step: 'Harvested',
                        report: {
                            reportId: 't1',
                            reportType: 'HarvestLog',
                            reportHash: 'hash123abc',
                            summary: 'Harvest completed - good quality',
                            isVerified: true,
                            verificationSource: 'RiceTrace-Oracle',
                            verificationTimestamp: now
                        }
                    }
                ]
            },
            {
                docType: 'riceBatch',
                batchId: 'batch2',
                origin: 'Sichuan',
                variety: 'Indica',
                harvestDate: '2024-09-20',
                currentOwner: 'Farmer Li',
                currentState: 'Stored',
                history: [
                    {
                        timestamp: now,
                        from: '',
                        to: 'Farmer Li',
                        step: 'Stored',
                        report: {
                            reportId: 't2',
                            reportType: 'StorageLog',
                            reportHash: 'hash456def',
                            summary: 'Storage completed - optimal conditions',
                            isVerified: true,
                            verificationSource: 'RiceTrace-Oracle',
                            verificationTimestamp: now
                        }
                    }
                ]
            }
        ];

        for (const batch of batches) {
            await ctx.stub.putState(
                `batch_${batch.batchId}`,
                Buffer.from(stringify(sortKeysRecursive(batch)))
            );
        }

        const products: Product[] = [
            {
                docType: 'product',
                productId: 'product1',
                batchId: 'batch1',
                packageDate: now,
                owner: 'Processor A'
            },
            {
                docType: 'product',
                productId: 'product2',
                batchId: 'batch2',
                packageDate: now,
                owner: 'Processor B'
            }
        ];

        for (const product of products) {
            await ctx.stub.putState(
                `product_${product.productId}`,
                Buffer.from(stringify(sortKeysRecursive(product)))
            );
        }
    }

    /**
     * Create new rice batch
     * Permission: Only farm can call
     */
    @Transaction()
    public async CreateRiceBatch(
        ctx: Context,
        batchId: string,
        origin: string,
        variety: string,
        harvestDate: string,
        initialTestResultJSON: string,
        owner: string,
        initialStep: string,
        operator: string
    ): Promise<void> {
        // Check permission: Only farm can create batch
        this.checkPermission(ctx, [OrganizationType.FARM]);

        const exists = await this.RiceBatchExists(ctx, batchId);
        if (exists) {
            throw new Error(`The rice batch ${batchId} already exists`);
        }

        // Parse initial test result
        const initialTestResult: TestResult = JSON.parse(initialTestResultJSON);

        // Get transaction timestamp
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        // Create initial report detail based on test result
        const initialReport: ReportDetail = {
            reportId: initialTestResult.testId || initialTestResult.reportId || '',
            reportType: 'HarvestLog',
            reportHash: initialTestResult.reportHash || '',
            summary: `Initial harvest completed - ${initialStep}`,
            isVerified: initialTestResult.isVerified || false,
            verificationSource: initialTestResult.verificationSource,
            verificationTimestamp: now,
            notes: initialTestResult.notes
        };

        // Create initial history event
        const initialHistoryEvent: HistoryEvent = {
            timestamp: now,
            from: '',
            to: owner,
            step: initialStep,
            report: initialReport
        };

        const batch: RiceBatch = {
            docType: 'riceBatch',
            batchId,
            origin,
            variety,
            harvestDate,
            currentOwner: owner,
            currentState: initialStep,
            history: [initialHistoryEvent]
        };

        await ctx.stub.putState(
            `batch_${batchId}`,
            Buffer.from(stringify(sortKeysRecursive(batch)))
        );
    }



    /**
     * Complete step and transfer - new unified transaction method
     * Merge processing record and ownership transfer into a single atomic operation
     * Permission: Farm and middleman/tester can call
     */
    @Transaction()
    public async CompleteStepAndTransfer(
        ctx: Context,
        batchId: string,
        fromOperator: string,
        toOperator: string,
        step: string,
        reportStr: string // JSON字符串格式的ReportDetail
    ): Promise<void> {
        // Check permission: Farm and middleman/tester can call
        this.checkPermission(ctx, [OrganizationType.FARM, OrganizationType.MIDDLEMAN_TESTER]);

        const batch = await this.ReadRiceBatch(ctx, batchId);

        // Get transaction timestamp
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        // Parse report detail
        let report: ReportDetail;
        try {
            report = JSON.parse(reportStr);
        } catch (error) {
            throw new Error(`Report format error: ${error}`);
        }

        // Create new history event
        const historyEvent: HistoryEvent = {
            timestamp: now,
            from: fromOperator,
            to: toOperator,
            step: step,
            report: report
        };

        // Add event to history
        batch.history.push(historyEvent);

        // Update batch status
        batch.currentOwner = toOperator;
        batch.currentState = step;

        await ctx.stub.putState(
            `batch_${batchId}`,
            Buffer.from(stringify(sortKeysRecursive(batch)))
        );
    }

    /**
     * Get complete history event record of the batch
     * Permission: All organizations can query
     */
    @Transaction(false)
    @Returns('HistoryEvent[]')
    public async GetBatchHistory(ctx: Context, batchId: string): Promise<HistoryEvent[]> {
        const batch = await this.ReadRiceBatch(ctx, batchId);
        return batch.history;
    }

    /**
     * Get current status summary of the batch
     * Permission: All organizations can query
     */
    @Transaction(false)
    @Returns('string')
    public async GetBatchCurrentStatus(ctx: Context, batchId: string): Promise<string> {
        const batch = await this.ReadRiceBatch(ctx, batchId);
        
        const statusInfo = {
            batchId: batch.batchId,
            currentOwner: batch.currentOwner,
            currentState: batch.currentState,
            variety: batch.variety,
            origin: batch.origin,
            harvestDate: batch.harvestDate,
            totalEvents: batch.history.length,
            lastUpdate: batch.history.length > 0 ? batch.history[batch.history.length - 1].timestamp : ''
        };
        
        return JSON.stringify(statusInfo, null, 2);
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

        const batchExists = await this.RiceBatchExists(ctx, batchId);
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
        const batch = await this.ReadRiceBatch(ctx, product.batchId);

        return {
            product,
            batch
        };
    }

    /**
     * Read rice batch information
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('RiceBatch')
    public async ReadRiceBatch(ctx: Context, batchId: string): Promise<RiceBatch> {
        const batchJSON = await ctx.stub.getState(`batch_${batchId}`);
        if (!batchJSON || batchJSON.length === 0) {
            throw new Error(`The rice batch ${batchId} does not exist`);
        }

        return JSON.parse(batchJSON.toString());
    }

    /**
     * Check if rice batch exists
     * Permission: No restriction
     */
    @Transaction(false)
    public async RiceBatchExists(ctx: Context, batchId: string): Promise<boolean> {
        const batchJSON = await ctx.stub.getState(`batch_${batchId}`);
        return batchJSON && batchJSON.length > 0;
    }

    /**
     * Get all rice batches
     * Permission: No restriction
     */
    @Transaction(false)
    @Returns('RiceBatch[]')
    public async GetAllRiceBatches(ctx: Context): Promise<RiceBatch[]> {
        const resultsIterator = await ctx.stub.getStateByRange('batch_', 'batch_\uffff');
        const batches: RiceBatch[] = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                try {
                    const batch: RiceBatch = JSON.parse(result.value.value.toString());
                    if (batch.batchId) {
                        batches.push(batch);
                    }
                } catch (error) {
                    // Skip invalid data
                    console.warn(`Skipping invalid batch data: ${error}`);
                }
            }
            result = await resultsIterator.next();
        }

        await resultsIterator.close();
        return batches;
    }
} 