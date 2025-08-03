/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { RiceTracerContract } from './riceTracerContract';
import { ProductManagementContract } from './productManagementContract';
import { QualityCertificationContract } from './qualityCertificationContract';

module.exports.RiceTracerContract = RiceTracerContract;
module.exports.ProductManagementContract = ProductManagementContract;
module.exports.QualityCertificationContract = QualityCertificationContract;
module.exports.contracts = [RiceTracerContract, ProductManagementContract, QualityCertificationContract]; 