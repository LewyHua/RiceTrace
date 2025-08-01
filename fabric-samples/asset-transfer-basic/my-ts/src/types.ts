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
 * 通用报告结构 - 用于记录各环节的证明材料
 */
@Object()
export class ReportDetail {
    @Property()
    public reportId: string = '';

    @Property()
    public reportType: string = ''; // 报告类型：HarvestLog, ShippingManifest, QualityTest, ProcessingRecord 等

    @Property()
    public reportHash: string = ''; // 链下文件的哈希值

    @Property()
    public summary: string = ''; // 关键信息摘要

    // 以下为可选的扩展字段，保持灵活性
    @Property()
    public temperature?: string;

    @Property()
    public result?: string;

    @Property()
    public isVerified?: boolean;

    @Property()
    public verificationSource?: string;

    @Property()
    public tester?: string;

    @Property()
    public laboratory?: string;

    @Property()
    public certificationNumber?: string;

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
 * 水稻批次结构 - 新版本统一事件溯源模型
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

    @Property()
    public currentOwner: string = ''; // 当前所有者

    @Property()
    public currentState: string = ''; // 当前状态/环节

    @Property('history', 'HistoryEvent[]')
    public history: HistoryEvent[] = []; // 统一的历史事件记录

    // 以下字段保留用于向后兼容，但不再主要使用
    @Property('testResults', 'TestResult[]')
    public testResults: TestResult[] = [];

    @Property('ownerHistory', 'OwnerTransfer[]')
    public ownerHistory: OwnerTransfer[] = [];

    @Property('processHistory', 'ProcessingRecord[]')
    public processHistory: ProcessingRecord[] = [];

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