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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiceTracerContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
const json_stringify_deterministic_1 = __importDefault(require("json-stringify-deterministic"));
const sort_keys_recursive_1 = __importDefault(require("sort-keys-recursive"));
const types_1 = require("./types");
let RiceTracerContract = class RiceTracerContract extends fabric_contract_api_1.Contract {
    /**
     * 根据MSP ID获取机构类型
     * 这里可以根据实际的组织结构进行配置
     */
    getOrganizationType(mspId) {
        // 根据 MSP ID 映射到机构类型
        // 可以根据实际情况修改这个映射关系
        const mspToOrgType = {
            'Org1MSP': types_1.OrganizationType.FARM, // 农场组织
            'Org2MSP': types_1.OrganizationType.MIDDLEMAN_TESTER, // 中间商/测试机构
            'Org3MSP': types_1.OrganizationType.CONSUMER // 消费者组织
        };
        return mspToOrgType[mspId] || types_1.OrganizationType.CONSUMER;
    }
    /**
     * 检查调用者是否有权限执行特定操作
     */
    checkPermission(ctx, allowedTypes) {
        const mspId = ctx.clientIdentity.getMSPID();
        const callerType = this.getOrganizationType(mspId);
        if (!allowedTypes.includes(callerType)) {
            const allowedNames = allowedTypes.map(type => {
                switch (type) {
                    case types_1.OrganizationType.FARM: return '农场';
                    case types_1.OrganizationType.MIDDLEMAN_TESTER: return '中间商/测试机构';
                    case types_1.OrganizationType.CONSUMER: return '消费者';
                    default: return '未知';
                }
            }).join(', ');
            throw new Error(`权限不足：当前操作只允许以下机构类型调用: ${allowedNames}`);
        }
    }
    /**
     * 获取调用者机构信息
     */
    async GetCallerInfo(ctx) {
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
    async GetPermissionMatrix(ctx) {
        const permissionMatrix = {
            "方法权限配置": {
                "InitLedger": ["农场"],
                "CreateRiceBatch": ["农场"],
                "AddTestResult": ["中间商/测试机构"],
                "TransferRiceBatch": ["农场", "中间商/测试机构"],
                "AddProcessingRecord": ["农场", "中间商/测试机构"],
                "CreateProduct": ["中间商/测试机构"],
                "ReadProduct": ["所有机构"],
                "ReadRiceBatch": ["所有机构"],
                "RiceBatchExists": ["所有机构"],
                "GetAllRiceBatches": ["所有机构"],
                "GetCallerInfo": ["所有机构"],
                "GetPermissionMatrix": ["所有机构"]
            },
            "机构类型说明": {
                "1": "农场 (FARM) - 负责创建批次、初期加工和转移",
                "2": "中间商/测试机构 (MIDDLEMAN_TESTER) - 负责质检、深加工和产品包装",
                "3": "消费者 (CONSUMER) - 只能查看信息"
            }
        };
        return JSON.stringify(permissionMatrix, null, 2);
    }
    /**
     * 初始化账本数据
     * 权限：只有农场可以调用
     */
    async InitLedger(ctx) {
        // 检查权限：只有农场可以初始化账本
        this.checkPermission(ctx, [types_1.OrganizationType.FARM]);
        // 获取交易时间戳，确保确定性
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();
        const batches = [
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
            await ctx.stub.putState(`batch_${batch.batchId}`, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(batch))));
        }
        const products = [
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
            await ctx.stub.putState(`product_${product.productId}`, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(product))));
        }
    }
    /**
     * 创建新的水稻批次
     * 权限：只有农场可以调用
     */
    async CreateRiceBatch(ctx, batchId, origin, variety, harvestDate, initialTestResultJSON, owner, initialStep, operator) {
        // 检查权限：只有农场可以创建批次
        this.checkPermission(ctx, [types_1.OrganizationType.FARM]);
        const exists = await this.RiceBatchExists(ctx, batchId);
        if (exists) {
            throw new Error(`The rice batch ${batchId} already exists`);
        }
        // 解析初始测试结果
        const initialTestResult = JSON.parse(initialTestResultJSON);
        // 获取交易时间戳
        const txTimestamp = ctx.stub.getTxTimestamp();
        const now = new Date(txTimestamp.seconds.toNumber() * 1000).toISOString();
        const batch = {
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
        await ctx.stub.putState(`batch_${batchId}`, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(batch))));
    }
    /**
     * 添加质检结果
     * 权限：只有中间商/测试机构可以调用
     */
    async AddTestResult(ctx, batchId, testResultJSON) {
        // 检查权限：只有中间商/测试机构可以添加质检结果
        this.checkPermission(ctx, [types_1.OrganizationType.MIDDLEMAN_TESTER]);
        const batch = await this.ReadRiceBatch(ctx, batchId);
        const testResult = JSON.parse(testResultJSON);
        batch.testResults.push(testResult);
        await ctx.stub.putState(`batch_${batchId}`, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(batch))));
    }
    /**
     * 转移批次所有权
     * 权限：农场和中间商/测试机构可以调用
     */
    async TransferRiceBatch(ctx, batchId, newOwner, operator) {
        // 检查权限：农场和中间商都可以转移批次所有权
        this.checkPermission(ctx, [types_1.OrganizationType.FARM, types_1.OrganizationType.MIDDLEMAN_TESTER]);
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
        await ctx.stub.putState(`batch_${batchId}`, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(batch))));
    }
    /**
     * 添加加工记录
     * 权限：农场和中间商/测试机构可以调用
     */
    async AddProcessingRecord(ctx, batchId, step, operator) {
        // 检查权限：农场和中间商都可以添加加工记录
        this.checkPermission(ctx, [types_1.OrganizationType.FARM, types_1.OrganizationType.MIDDLEMAN_TESTER]);
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
        await ctx.stub.putState(`batch_${batchId}`, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(batch))));
    }
    /**
     * 创建产品
     * 权限：只有中间商/测试机构可以调用
     */
    async CreateProduct(ctx, productId, batchId, packageDate, owner) {
        // 检查权限：只有中间商可以创建最终产品
        this.checkPermission(ctx, [types_1.OrganizationType.MIDDLEMAN_TESTER]);
        const existingProduct = await ctx.stub.getState(`product_${productId}`);
        if (existingProduct && existingProduct.length > 0) {
            throw new Error(`Product ${productId} already exists`);
        }
        const batchExists = await this.RiceBatchExists(ctx, batchId);
        if (!batchExists) {
            throw new Error(`Batch ${batchId} does not exist`);
        }
        const product = {
            docType: 'product',
            productId,
            batchId,
            packageDate,
            owner
        };
        await ctx.stub.putState(`product_${productId}`, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(product))));
    }
    /**
     * 读取产品信息（包含关联的批次信息）
     * 权限：无限制
     */
    async ReadProduct(ctx, productId) {
        const productJSON = await ctx.stub.getState(`product_${productId}`);
        if (!productJSON || productJSON.length === 0) {
            throw new Error(`Product ${productId} does not exist`);
        }
        const product = JSON.parse(productJSON.toString());
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
    async ReadRiceBatch(ctx, batchId) {
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
    async RiceBatchExists(ctx, batchId) {
        const batchJSON = await ctx.stub.getState(`batch_${batchId}`);
        return batchJSON && batchJSON.length > 0;
    }
    /**
     * 获取所有水稻批次
     * 权限：无限制
     */
    async GetAllRiceBatches(ctx) {
        const resultsIterator = await ctx.stub.getStateByRange('batch_', 'batch_\uffff');
        const batches = [];
        let result = await resultsIterator.next();
        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                try {
                    const batch = JSON.parse(result.value.value.toString());
                    if (batch.batchId) {
                        batches.push(batch);
                    }
                }
                catch (error) {
                    // 跳过无效的数据
                    console.warn(`Skipping invalid batch data: ${error}`);
                }
            }
            result = await resultsIterator.next();
        }
        await resultsIterator.close();
        return batches;
    }
};
exports.RiceTracerContract = RiceTracerContract;
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('OrganizationInfo'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "GetCallerInfo", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "GetPermissionMatrix", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "InitLedger", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "CreateRiceBatch", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "AddTestResult", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "TransferRiceBatch", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "AddProcessingRecord", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, String]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "CreateProduct", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('ProductWithBatch'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "ReadProduct", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('RiceBatch'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "ReadRiceBatch", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "RiceBatchExists", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('RiceBatch[]'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context]),
    __metadata("design:returntype", Promise)
], RiceTracerContract.prototype, "GetAllRiceBatches", null);
exports.RiceTracerContract = RiceTracerContract = __decorate([
    (0, fabric_contract_api_1.Info)({ title: 'RiceTracerContract', description: 'Smart contract for rice traceability system' })
], RiceTracerContract);
//# sourceMappingURL=riceTracerContract.js.map