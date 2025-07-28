/**
 * 机构类型枚举
 */
export declare enum OrganizationType {
    FARM = 1,// 农场
    MIDDLEMAN_TESTER = 2,// 中间商/测试机构
    CONSUMER = 3
}
/**
 * 机构信息
 */
export declare class OrganizationInfo {
    orgId: string;
    orgType: OrganizationType;
    orgName: string;
}
/**
 * 所有权转移记录
 */
export declare class OwnerTransfer {
    from: string;
    to: string;
    timestamp: string;
}
/**
 * 加工流程记录
 */
export declare class ProcessingRecord {
    step: string;
    timestamp: string;
    operator: string;
}
/**
 * 质检信息结构
 */
export declare class TestResult {
    testId: string;
    testerId: string;
    timestamp: string;
    temperature: string;
    report: string;
    result: string;
}
/**
 * 水稻批次结构
 */
export declare class RiceBatch {
    docType: string;
    batchId: string;
    origin: string;
    variety: string;
    harvestDate: string;
    testResults: TestResult[];
    ownerHistory: OwnerTransfer[];
    processHistory: ProcessingRecord[];
    currentOwner: string;
    processingStep: string;
}
/**
 * 产品结构
 */
export declare class Product {
    docType: string;
    productId: string;
    batchId: string;
    packageDate: string;
    owner: string;
}
/**
 * 产品和批次联合查询结果
 */
export declare class ProductWithBatch {
    product: Product;
    batch: RiceBatch;
}
