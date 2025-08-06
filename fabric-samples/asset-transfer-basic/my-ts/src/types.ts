/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Object, Property } from 'fabric-contract-api';

/**
 * Organization type enumeration
 */
export enum OrganizationType {
    FARM = 1,           // Farm
    MIDDLEMAN_TESTER = 2, // Middleman/tester
    CONSUMER = 3        // Consumer
}

/**
 * Organization information
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
 * History event record - unified record of ownership transfer and processing
 */
@Object()
export class HistoryEvent {
    @Property()
    public timestamp: string = ''; // ISO8601 format

    @Property()
    public from: string = ''; // Transfer source

    @Property()
    public to: string = ''; // Transfer destination

    @Property()
    public step: string = ''; // Current step: Harvested, Transporting, QualityInspection, Processing, Packaged, etc.

    @Property('report', 'ReportDetail')
    public report: ReportDetail = new ReportDetail();
}

/**
 * Test result structure - retained for backward compatibility
 */
@Object()
export class TestResult {
    @Property()
    public docType: string = 'testResult';

    @Property()
    public testId: string = '';

    @Property()
    public batchId: string = '';

    @Property()
    public testType: string = '';

    @Property()
    public testDate: string = '';

    @Property()
    public testResult: string = '';

    @Property()
    public tester: string = '';

    @Property()
    public notes: string = '';

    @Property()
    public isVerified: boolean = false;

    @Property()
    public verificationSource: string = '';

    @Property()
    public verificationTimestamp: string = '';

    @Property()
    public reportHash: string = '';

    @Property()
    public reportId: string = '';

    // Legacy fields for backward compatibility
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

    @Property()
    public externalReportId?: string;

    @Property()
    public laboratory?: string;

    @Property()
    public certificationNumber?: string;
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
 * Product structure
 */
@Object()
export class Product {
    @Property()
    public docType: string = 'product'; // Fixed value "product"

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
 * Quality certificate structure
 */
@Object()
export class QualityCertificate {
    @Property()
    public docType: string = 'qualityCertificate';

    @Property()
    public certificateId: string = '';

    @Property()
    public batchId: string = '';

    @Property('testIds', 'string[]')
    public testIds: string[] = [];

    @Property()
    public certificateType: string = '';

    @Property()
    public issueDate: string = '';

    @Property()
    public issuer: string = '';

    @Property()
    public validityPeriod: string = '';

    @Property()
    public standards: string = '';

    @Property()
    public isActive: boolean = true;

    @Property()
    public createdTimestamp: string = '';

    @Property()
    public lastUpdated: string = '';
}

/**
 * Combined query result of product and batch
 */
@Object()
export class ProductWithBatch {
    @Property('product', 'Product')
    public product: Product = new Product();

    @Property('batch', 'RiceBatch')
    public batch: RiceBatch = new RiceBatch();
} 