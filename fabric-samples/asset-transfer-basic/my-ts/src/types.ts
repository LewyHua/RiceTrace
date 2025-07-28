/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Object, Property } from 'fabric-contract-api';

/**
 * 机构类型枚举
 */
export enum OrganizationType {
    FARM = 1,           // 农场
    MIDDLEMAN_TESTER = 2, // 中间商/测试机构
    CONSUMER = 3        // 消费者
}

/**
 * 机构信息
 */
@Object()
export class OrganizationInfo {
    @Property()
    public orgId: string = '';

    @Property()
    public orgType: OrganizationType = OrganizationType.CONSUMER;

    @Property()
    public orgName: string = '';
}

/**
 * 所有权转移记录
 */
@Object()
export class OwnerTransfer {
    @Property()
    public from: string = '';

    @Property()
    public to: string = '';

    @Property()
    public timestamp: string = ''; // ISO8601格式
}

/**
 * 加工流程记录
 */
@Object()
export class ProcessingRecord {
    @Property()
    public step: string = '';

    @Property()
    public timestamp: string = ''; // ISO8601格式

    @Property()
    public operator: string = ''; // 操作人或机构
}

/**
 * 质检信息结构
 */
@Object()
export class TestResult {
    @Property()
    public testId: string = '';

    @Property()
    public testerId: string = '';

    @Property()
    public timestamp: string = '';

    @Property()
    public temperature: string = '';

    @Property()
    public report: string = '';

    @Property()
    public result: string = '';
}

/**
 * 水稻批次结构
 */
@Object()
export class RiceBatch {
    @Property()
    public docType: string = 'riceBatch'; // 固定值 "riceBatch"

    @Property()
    public batchId: string = '';

    @Property()
    public origin: string = '';

    @Property()
    public variety: string = '';

    @Property()
    public harvestDate: string = '';

    @Property('testResults', 'TestResult[]')
    public testResults: TestResult[] = [];

    @Property('ownerHistory', 'OwnerTransfer[]')
    public ownerHistory: OwnerTransfer[] = [];

    @Property('processHistory', 'ProcessingRecord[]')
    public processHistory: ProcessingRecord[] = [];

    @Property()
    public currentOwner: string = '';

    @Property()
    public processingStep: string = '';
}

/**
 * 产品结构
 */
@Object()
export class Product {
    @Property()
    public docType: string = 'product'; // 固定值 "product"

    @Property()
    public productId: string = '';

    @Property()
    public batchId: string = '';

    @Property()
    public packageDate: string = '';

    @Property()
    public owner: string = '';
}

/**
 * 产品和批次联合查询结果
 */
@Object()
export class ProductWithBatch {
    @Property('product', 'Product')
    public product: Product = new Product();

    @Property('batch', 'RiceBatch')
    public batch: RiceBatch = new RiceBatch();
} 