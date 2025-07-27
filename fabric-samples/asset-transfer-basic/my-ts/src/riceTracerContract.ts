/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import { RiceBatch, Product, ProductWithBatch, TestResult, OwnerTransfer, ProcessingRecord } from './types';

@Info({ title: 'RiceTracerContract', description: 'Smart contract for rice traceability system' })
export class RiceTracerContract extends Contract {

    /**
     * 初始化账本数据
     */
    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
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
                testResults: [
                    {
                        testId: 't1',
                        testerId: 'tester1',
                        timestamp: now,
                        temperature: '20C',
                        report: 'Report1',
                        result: 'Passed'
                    }
                ],
                ownerHistory: [
                    {
                        from: '',
                        to: 'Farmer Zhang',
                        timestamp: now
                    }
                ],
                processHistory: [
                    {
                        step: 'Harvested',
                        timestamp: now,
                        operator: 'Farmer Zhang'
                    }
                ],
                currentOwner: 'Farmer Zhang',
                processingStep: 'Harvested'
            },
            {
                docType: 'riceBatch',
                batchId: 'batch2',
                origin: 'Sichuan',
                variety: 'Indica',
                harvestDate: '2024-09-20',
                testResults: [
                    {
                        testId: 't2',
                        testerId: 'tester2',
                        timestamp: now,
                        temperature: '22C',
                        report: 'Report2',
                        result: 'Passed'
                    }
                ],
                ownerHistory: [
                    {
                        from: '',
                        to: 'Farmer Li',
                        timestamp: now
                    }
                ],
                processHistory: [
                    {
                        step: 'Stored',
                        timestamp: now,
                        operator: 'Farmer Li'
                    }
                ],
                currentOwner: 'Farmer Li',
                processingStep: 'Stored'
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
        const exists = await this.RiceBatchExists(ctx, batchId);
        if (exists) {
            throw new Error(`The rice batch ${batchId} already exists`);
        }

        // 解析初始测试结果
        const initialTestResult: TestResult = JSON.parse(initialTestResultJSON);

        // 获取交易时间戳
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const batch: RiceBatch = {
            docType: 'riceBatch',
            batchId,
            origin,
            variety,
            harvestDate,
            testResults: [initialTestResult],
            ownerHistory: [
                {
                    from: '',
                    to: owner,
                    timestamp: now
                }
            ],
            processHistory: [
                {
                    step: initialStep,
                    timestamp: now,
                    operator
                }
            ],
            currentOwner: owner,
            processingStep: initialStep
        };

        await ctx.stub.putState(
            `batch_${batchId}`,
            Buffer.from(stringify(sortKeysRecursive(batch)))
        );
    }

    /**
     * 添加质检结果
     */
    @Transaction()
    public async AddTestResult(ctx: Context, batchId: string, testResultJSON: string): Promise<void> {
        const batch = await this.ReadRiceBatch(ctx, batchId);
        const testResult: TestResult = JSON.parse(testResultJSON);

        batch.testResults.push(testResult);

        await ctx.stub.putState(
            `batch_${batchId}`,
            Buffer.from(stringify(sortKeysRecursive(batch)))
        );
    }

    /**
     * 转移批次所有权
     */
    @Transaction()
    public async TransferRiceBatch(
        ctx: Context,
        batchId: string,
        newOwner: string,
        operator: string
    ): Promise<void> {
        const batch = await this.ReadRiceBatch(ctx, batchId);

        // 获取交易时间戳
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        const oldOwner = batch.currentOwner;
        batch.ownerHistory.push({
            from: oldOwner,
            to: newOwner,
            timestamp: now
        });
        batch.currentOwner = newOwner;

        await ctx.stub.putState(
            `batch_${batchId}`,
            Buffer.from(stringify(sortKeysRecursive(batch)))
        );
    }

    /**
     * 添加加工记录
     */
    @Transaction()
    public async AddProcessingRecord(
        ctx: Context,
        batchId: string,
        step: string,
        operator: string
    ): Promise<void> {
        const batch = await this.ReadRiceBatch(ctx, batchId);

        // 获取交易时间戳
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();

        batch.processHistory.push({
            step,
            timestamp: now,
            operator
        });
        batch.processingStep = step;

        await ctx.stub.putState(
            `batch_${batchId}`,
            Buffer.from(stringify(sortKeysRecursive(batch)))
        );
    }

    /**
     * 创建产品
     */
    @Transaction()
    public async CreateProduct(
        ctx: Context,
        productId: string,
        batchId: string,
        packageDate: string,
        owner: string
    ): Promise<void> {
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
     */
    @Transaction(false)
    public async RiceBatchExists(ctx: Context, batchId: string): Promise<boolean> {
        const batchJSON = await ctx.stub.getState(`batch_${batchId}`);
        return batchJSON && batchJSON.length > 0;
    }

    /**
     * 获取所有水稻批次
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