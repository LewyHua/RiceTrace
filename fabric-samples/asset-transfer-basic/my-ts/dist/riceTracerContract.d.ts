import { Context, Contract } from 'fabric-contract-api';
import { RiceBatch, ProductWithBatch } from './types';
export declare class RiceTracerContract extends Contract {
    /**
     * 初始化账本数据
     */
    InitLedger(ctx: Context): Promise<void>;
    /**
     * 创建新的水稻批次
     */
    CreateRiceBatch(ctx: Context, batchId: string, origin: string, variety: string, harvestDate: string, initialTestResultJSON: string, owner: string, initialStep: string, operator: string): Promise<void>;
    /**
     * 添加质检结果
     */
    AddTestResult(ctx: Context, batchId: string, testResultJSON: string): Promise<void>;
    /**
     * 转移批次所有权
     */
    TransferRiceBatch(ctx: Context, batchId: string, newOwner: string, operator: string): Promise<void>;
    /**
     * 添加加工记录
     */
    AddProcessingRecord(ctx: Context, batchId: string, step: string, operator: string): Promise<void>;
    /**
     * 创建产品
     */
    CreateProduct(ctx: Context, productId: string, batchId: string, packageDate: string, owner: string): Promise<void>;
    /**
     * 读取产品信息（包含关联的批次信息）
     */
    ReadProduct(ctx: Context, productId: string): Promise<ProductWithBatch>;
    /**
     * 读取水稻批次信息
     */
    ReadRiceBatch(ctx: Context, batchId: string): Promise<RiceBatch>;
    /**
     * 检查水稻批次是否存在
     */
    RiceBatchExists(ctx: Context, batchId: string): Promise<boolean>;
    /**
     * 获取所有水稻批次
     */
    GetAllRiceBatches(ctx: Context): Promise<RiceBatch[]>;
}
