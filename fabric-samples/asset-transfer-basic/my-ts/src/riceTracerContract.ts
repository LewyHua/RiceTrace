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
     * 根据MSP ID获取机构类型
     * 这里可以根据实际的组织结构进行配置
     */
    private getOrganizationType(mspId: string): OrganizationType {
        // 根据 MSP ID 映射到机构类型
        // 可以根据实际情况修改这个映射关系
        const mspToOrgType: Record<string, OrganizationType> = {
            'Org1MSP': OrganizationType.FARM,              // 农场组织
            'Org2MSP': OrganizationType.MIDDLEMAN_TESTER,  // 中间商/测试机构
            'Org3MSP': OrganizationType.CONSUMER           // 消费者组织
        };

        return mspToOrgType[mspId] || OrganizationType.CONSUMER;
    }

    /**
     * 检查调用者是否有权限执行特定操作
     */
    private checkPermission(ctx: Context, allowedTypes: OrganizationType[]): void {
        const mspId = ctx.clientIdentity.getMSPID();
        const callerType = this.getOrganizationType(mspId);

        if (!allowedTypes.includes(callerType)) {
            const allowedNames = allowedTypes.map(type => {
                switch (type) {
                    case OrganizationType.FARM: return '农场';
                    case OrganizationType.MIDDLEMAN_TESTER: return '中间商/测试机构';
                    case OrganizationType.CONSUMER: return '消费者';
                    default: return '未知';
                }
            }).join(', ');
            
            throw new Error(`权限不足：当前操作只允许以下机构类型调用: ${allowedNames}`);
        }
    }

    /**
     * 获取调用者机构信息
     */
    @Transaction(false)
    @Returns('OrganizationInfo')
    public async GetCallerInfo(ctx: Context): Promise<OrganizationInfo> {
        const mspId = ctx.clientIdentity.getMSPID();
        const orgType = this.getOrganizationType(mspId);
        
        return {
            orgId: mspId,
            orgType: orgType,
            orgName: mspId // 可以根据需要映射到更友好的名称
        };
    }

    /**
     * 获取所有方法的权限配置
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
     * 初始化账本数据
     * 权限：只有农场可以调用
     */
    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        // 检查权限：只有农场可以初始化账本
        this.checkPermission(ctx, [OrganizationType.FARM]);

        // 获取交易时间戳，确保确定性
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
     * 创建新的水稻批次
     * 权限：只有农场可以调用
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
        // 检查权限：只有农场可以创建批次
        this.checkPermission(ctx, [OrganizationType.FARM]);

        const exists = await this.RiceBatchExists(ctx, batchId);
        if (exists) {
            throw new Error(`The rice batch ${batchId} already exists`);
        }

        // 解析初始测试结果
        const initialTestResult: TestResult = JSON.parse(initialTestResultJSON);

        // 获取交易时间戳
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

        // 创建初始历史事件
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
     * 完成步骤并转移 - 新的统一事务方法
     * 将处理过程记录和所有权转移合并为一个原子操作
     * 权限：农场和中间商/测试机构可以调用
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
        // 检查权限：农场和中间商都可以调用
        this.checkPermission(ctx, [OrganizationType.FARM, OrganizationType.MIDDLEMAN_TESTER]);

        const batch = await this.ReadRiceBatch(ctx, batchId);

        // 获取交易时间戳
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        // 解析报告详情
        let report: ReportDetail;
        try {
            report = JSON.parse(reportStr);
        } catch (error) {
            throw new Error(`报告格式错误：${error}`);
        }

        // 创建新的历史事件
        const historyEvent: HistoryEvent = {
            timestamp: now,
            from: fromOperator,
            to: toOperator,
            step: step,
            report: report
        };

        // 将事件添加到历史记录
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
     * 获取批次的完整历史事件记录
     * 权限：所有机构都可以查询
     */
    @Transaction(false)
    @Returns('HistoryEvent[]')
    public async GetBatchHistory(ctx: Context, batchId: string): Promise<HistoryEvent[]> {
        const batch = await this.ReadRiceBatch(ctx, batchId);
        return batch.history;
    }

    /**
     * 获取批次的当前状态摘要
     * 权限：所有机构都可以查询
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
     * 创建产品
     * 权限：只有中间商/测试机构可以调用
     */
    @Transaction()
    public async CreateProduct(
        ctx: Context,
        productId: string,
        batchId: string,
        packageDate: string,
        owner: string
    ): Promise<void> {
        // 检查权限：只有中间商可以创建最终产品
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
     * 读取产品信息（包含关联的批次信息）
     * 权限：无限制
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
     * 读取水稻批次信息
     * 权限：无限制
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
     * 检查水稻批次是否存在
     * 权限：无限制
     */
    @Transaction(false)
    public async RiceBatchExists(ctx: Context, batchId: string): Promise<boolean> {
        const batchJSON = await ctx.stub.getState(`batch_${batchId}`);
        return batchJSON && batchJSON.length > 0;
    }

    /**
     * 获取所有水稻批次
     * 权限：无限制
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
                    // 跳过无效的数据
                    console.warn(`Skipping invalid batch data: ${error}`);
                }
            }
            result = await resultsIterator.next();
        }

        await resultsIterator.close();
        return batches;
    }
} 