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
 * Generic report structure for recording evidence of each process step
 */
@Object()
export class ReportDetail {
    @Property()
    public reportId: string = '';

    @Property()
    public reportType: string = ''; // Report type: HarvestLog, ShippingManifest, QualityTest, ProcessingRecord, etc.

    @Property()
    public reportHash: string = ''; // Hash of the off-chain file

    @Property()
    public summary: string = ''; // Key information summary

    @Property()
    public isVerified: boolean = false;

    @Property()
    public verificationSource?: string;

    @Property()
    public verificationTimestamp?: string;

    @Property()
    public notes?: string;
}

/**
 * 历史事件记录 - 统一记录所有权转移和处理过程
 */
@Object()
export class HistoryEvent {
    @Property()
    public timestamp: string = ''; // ISO8601格式

    @Property()
    public from: string = ''; // 转移来源方

    @Property()
    public to: string = ''; // 转移接收方

    @Property()
    public step: string = ''; // 当前环节：Harvested, Transporting, QualityInspection, Processing, Packaged 等

    @Property('report', 'ReportDetail')
    public report: ReportDetail = new ReportDetail();
}

/**
 * 质检信息结构 - 保留用于向后兼容
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

    // Oracle 验证相关字段
    @Property()
    public isVerified: boolean = false;

    @Property()
    public verificationSource?: string;

    @Property()
    public externalReportId?: string;

    @Property()
    public tester?: string;

    @Property()
    public testDate?: string;

    @Property()
    public laboratory?: string;

    @Property()
    public certificationNumber?: string;

    @Property()
    public notes?: string;

    @Property()
    public reportHash?: string;

    @Property()
    public reportId?: string;
}

/**
 * Rice batch structure - unified event sourcing model
 */
@Object()
export class RiceBatch {
    @Property()
    public docType: string = 'riceBatch';

    @Property()
    public batchId: string = '';

    @Property()
    public origin: string = '';

    @Property()
    public variety: string = '';

    @Property()
    public harvestDate: string = '';

    @Property()
    public currentOwner: string = '';

    @Property()
    public currentState: string = '';

    @Property('history', 'HistoryEvent[]')
    public history: HistoryEvent[] = [];
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