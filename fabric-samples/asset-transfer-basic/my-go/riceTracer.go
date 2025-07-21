/*
SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"log"
	"riceTracer/chaincode-go"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

func main() {
	assetChaincode, err := contractapi.NewChaincode(&chaincode.SmartContract{})
	if err != nil {
		log.Panicf("Error creating riceTracer chaincode: %v", err)
	}

	if err := assetChaincode.Start(); err != nil {
		log.Panicf("Error starting riceTracer chaincode: %v", err)
	}
}
