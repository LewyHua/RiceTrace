"use strict";
/*
 * SPDX-License-Identifier: Apache-2.0
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductWithBatch = exports.Product = exports.RiceBatch = exports.TestResult = exports.ProcessingRecord = exports.OwnerTransfer = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
/**
 * 所有权转移记录
 */
let OwnerTransfer = class OwnerTransfer {
    constructor() {
        this.from = '';
        this.to = '';
        this.timestamp = ''; // ISO8601格式
    }
};
exports.OwnerTransfer = OwnerTransfer;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], OwnerTransfer.prototype, "from", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], OwnerTransfer.prototype, "to", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], OwnerTransfer.prototype, "timestamp", void 0);
exports.OwnerTransfer = OwnerTransfer = __decorate([
    (0, fabric_contract_api_1.Object)()
], OwnerTransfer);
/**
 * 加工流程记录
 */
let ProcessingRecord = class ProcessingRecord {
    constructor() {
        this.step = '';
        this.timestamp = ''; // ISO8601格式
        this.operator = ''; // 操作人或机构
    }
};
exports.ProcessingRecord = ProcessingRecord;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], ProcessingRecord.prototype, "step", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], ProcessingRecord.prototype, "timestamp", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], ProcessingRecord.prototype, "operator", void 0);
exports.ProcessingRecord = ProcessingRecord = __decorate([
    (0, fabric_contract_api_1.Object)()
], ProcessingRecord);
/**
 * 质检信息结构
 */
let TestResult = class TestResult {
    constructor() {
        this.testId = '';
        this.testerId = '';
        this.timestamp = '';
        this.temperature = '';
        this.report = '';
        this.result = '';
    }
};
exports.TestResult = TestResult;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], TestResult.prototype, "testId", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], TestResult.prototype, "testerId", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], TestResult.prototype, "timestamp", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], TestResult.prototype, "temperature", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], TestResult.prototype, "report", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], TestResult.prototype, "result", void 0);
exports.TestResult = TestResult = __decorate([
    (0, fabric_contract_api_1.Object)()
], TestResult);
/**
 * 水稻批次结构
 */
let RiceBatch = class RiceBatch {
    constructor() {
        this.docType = 'riceBatch'; // 固定值 "riceBatch"
        this.batchId = '';
        this.origin = '';
        this.variety = '';
        this.harvestDate = '';
        this.testResults = [];
        this.ownerHistory = [];
        this.processHistory = [];
        this.currentOwner = '';
        this.processingStep = '';
    }
};
exports.RiceBatch = RiceBatch;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], RiceBatch.prototype, "docType", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], RiceBatch.prototype, "batchId", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], RiceBatch.prototype, "origin", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], RiceBatch.prototype, "variety", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], RiceBatch.prototype, "harvestDate", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)('testResults', 'TestResult[]'),
    __metadata("design:type", Array)
], RiceBatch.prototype, "testResults", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)('ownerHistory', 'OwnerTransfer[]'),
    __metadata("design:type", Array)
], RiceBatch.prototype, "ownerHistory", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)('processHistory', 'ProcessingRecord[]'),
    __metadata("design:type", Array)
], RiceBatch.prototype, "processHistory", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], RiceBatch.prototype, "currentOwner", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], RiceBatch.prototype, "processingStep", void 0);
exports.RiceBatch = RiceBatch = __decorate([
    (0, fabric_contract_api_1.Object)()
], RiceBatch);
/**
 * 产品结构
 */
let Product = class Product {
    constructor() {
        this.docType = 'product'; // 固定值 "product"
        this.productId = '';
        this.batchId = '';
        this.packageDate = '';
        this.owner = '';
    }
};
exports.Product = Product;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], Product.prototype, "docType", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], Product.prototype, "productId", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], Product.prototype, "batchId", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], Product.prototype, "packageDate", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], Product.prototype, "owner", void 0);
exports.Product = Product = __decorate([
    (0, fabric_contract_api_1.Object)()
], Product);
/**
 * 产品和批次联合查询结果
 */
let ProductWithBatch = class ProductWithBatch {
    constructor() {
        this.product = new Product();
        this.batch = new RiceBatch();
    }
};
exports.ProductWithBatch = ProductWithBatch;
__decorate([
    (0, fabric_contract_api_1.Property)('product', 'Product'),
    __metadata("design:type", Product)
], ProductWithBatch.prototype, "product", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)('batch', 'RiceBatch'),
    __metadata("design:type", RiceBatch)
], ProductWithBatch.prototype, "batch", void 0);
exports.ProductWithBatch = ProductWithBatch = __decorate([
    (0, fabric_contract_api_1.Object)()
], ProductWithBatch);
//# sourceMappingURL=types.js.map