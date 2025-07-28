import { Context, Contract } from 'fabric-contract-api';
import { RiceBatch, ProductWithBatch, OrganizationInfo } from './types';
export declare class RiceTracerContract extends Contract {
    /**
     * 根据MSP ID获取机构类型
     * 这里可以根据实际的组织结构进行配置
     */
    private getOrganizationType;
    /**
     * 检查调用者是否有权限执行特定操作
     */
    private checkPermission;
    /**
     * 获取调用者机构信息
     */
    GetCallerInfo(ctx: Context): Promise<OrganizationInfo>;
    /**
     * 获取所有方法的权限配置
     */
    GetPermissionMatrix(ctx: Context): Promise<string>;
    /**
     * 初始化账本数据
     * 权限：只有农场可以调用
     */
    InitLedger(ctx: Context): Promise<void>;
    /**
     * 创建新的水稻批次
     * 权限：只有农场可以调用
     */
    CreateRiceBatch(ctx: Context, batchId: string, origin: string, variety: string, harvestDate: string, initialTestResultJSON: string, owner: string, initialStep: string, operator: string): Promise<void>;
    /**
     * 添加质检结果
     * 权限：只有中间商/测试机构可以调用
     */
    AddTestResult(ctx: Context, batchId: string, testResultJSON: string): Promise<void>;
    /**
     * 转移批次所有权
     * 权限：农场和中间商/测试机构可以调用
     */
    TransferRiceBatch(ctx: Context, batchId: string, newOwner: string, operator: string): Promise<void>;
    /**
     * 添加加工记录
     * 权限：农场和中间商/测试机构可以调用
     */
    AddProcessingRecord(ctx: Context, batchId: string, step: string, operator: string): Promise<void>;
    /**
     * 创建产品
     * 权限：只有中间商/测试机构可以调用
     */
    CreateProduct(ctx: Context, productId: string, batchId: string, packageDate: string, owner: string): Promise<void>;
    /**
     * 读取产品信息（包含关联的批次信息）
     * 权限：无限制
     */
    ReadProduct(ctx: Context, productId: string): Promise<ProductWithBatch>;
    /**
     * 读取水稻批次信息
     * 权限：无限制
     */
    ReadRiceBatch(ctx: Context, batchId: string): Promise<RiceBatch>;
    /**
     * 检查水稻批次是否存在
     * 权限：无限制
     */
    RiceBatchExists(ctx: Context, batchId: string): Promise<boolean>;
    /**
     * 获取所有水稻批次
     * 权限：无限制
     */
    GetAllRiceBatches(ctx: Context): Promise<RiceBatch[]>;
}
