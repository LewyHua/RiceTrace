package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// SmartContract provides functions for managing Rice batches and Products
type SmartContract struct {
	contractapi.Contract
}

// OwnerTransfer 记录所有权转移历史
type OwnerTransfer struct {
	From      string `json:"from"`
	To        string `json:"to"`
	Timestamp string `json:"timestamp"` // ISO8601格式
}

// ProcessingRecord 记录加工流程历史
type ProcessingRecord struct {
	Step      string `json:"step"`
	Timestamp string `json:"timestamp"` // ISO8601格式
	Operator  string `json:"operator"`  // 操作人或机构
}

// TestResult 质检信息结构
type TestResult struct {
	TestID      string `json:"testId"`
	TesterID    string `json:"testerId"`
	Timestamp   string `json:"timestamp"`
	Temperature string `json:"temperature"`
	Report      string `json:"report"`
	Result      string `json:"result"`
}

// RiceBatch 批次结构
type RiceBatch struct {
	DocType        string             `json:"docType"` // 固定值 "riceBatch"
	BatchID        string             `json:"batchId"`
	Origin         string             `json:"origin"`
	Variety        string             `json:"variety"`
	HarvestDate    string             `json:"harvestDate"`
	TestResults    []TestResult       `json:"testResults"`
	OwnerHistory   []OwnerTransfer    `json:"ownerHistory"`
	ProcessHistory []ProcessingRecord `json:"processHistory"`
	CurrentOwner   string             `json:"currentOwner"`
	ProcessingStep string             `json:"processingStep"`
}

// Product 代表具体产品单元
type Product struct {
	DocType     string `json:"docType"` // 固定值 "product"
	ProductID   string `json:"productId"`
	BatchID     string `json:"batchId"`
	PackageDate string `json:"packageDate"`
	Owner       string `json:"owner"`
}

// InitLedger adds a base set of rice batches to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	now := time.Now().Format(time.RFC3339)

	batches := []RiceBatch{
		{
			DocType:     "riceBatch",
			BatchID:     "batch1",
			Origin:      "Heilongjiang",
			Variety:     "Japonica",
			HarvestDate: "2024-09-15",
			TestResults: []TestResult{
				{TestID: "t1", TesterID: "tester1", Timestamp: now, Temperature: "20C", Report: "Report1", Result: "Passed"},
			},
			OwnerHistory: []OwnerTransfer{
				{From: "", To: "Farmer Zhang", Timestamp: now},
			},
			ProcessHistory: []ProcessingRecord{
				{Step: "Harvested", Timestamp: now, Operator: "Farmer Zhang"},
			},
			CurrentOwner:   "Farmer Zhang",
			ProcessingStep: "Harvested",
		},
		{
			DocType:     "riceBatch",
			BatchID:     "batch2",
			Origin:      "Sichuan",
			Variety:     "Indica",
			HarvestDate: "2024-09-20",
			TestResults: []TestResult{
				{TestID: "t2", TesterID: "tester2", Timestamp: now, Temperature: "22C", Report: "Report2", Result: "Passed"},
			},
			OwnerHistory: []OwnerTransfer{
				{From: "", To: "Farmer Li", Timestamp: now},
			},
			ProcessHistory: []ProcessingRecord{
				{Step: "Stored", Timestamp: now, Operator: "Farmer Li"},
			},
			CurrentOwner:   "Farmer Li",
			ProcessingStep: "Stored",
		},
	}

	for _, batch := range batches {
		batchJSON, err := json.Marshal(batch)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState("batch_"+batch.BatchID, batchJSON)
		if err != nil {
			return fmt.Errorf("failed to put batch: %v", err)
		}
	}

	products := []Product{
		{DocType: "product", ProductID: "product1", BatchID: "batch1", PackageDate: now, Owner: "Processor A"},
		{DocType: "product", ProductID: "product2", BatchID: "batch2", PackageDate: now, Owner: "Processor B"},
	}

	for _, p := range products {
		pJSON, err := json.Marshal(p)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState("product_"+p.ProductID, pJSON)
		if err != nil {
			return fmt.Errorf("failed to put product: %v", err)
		}
	}
	return nil
}

// CreateRiceBatch creates a new batch
func (s *SmartContract) CreateRiceBatch(ctx contractapi.TransactionContextInterface, batchID, origin, variety, harvestDate string, initialTestResult TestResult, owner string, initialStep string, operator string) error {
	exists, err := s.RiceBatchExists(ctx, batchID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the rice batch %s already exists", batchID)
	}

	now := time.Now().Format(time.RFC3339)
	batch := RiceBatch{
		DocType:     "riceBatch",
		BatchID:     batchID,
		Origin:      origin,
		Variety:     variety,
		HarvestDate: harvestDate,
		TestResults: []TestResult{initialTestResult},
		OwnerHistory: []OwnerTransfer{
			{From: "", To: owner, Timestamp: now},
		},
		ProcessHistory: []ProcessingRecord{
			{Step: initialStep, Timestamp: now, Operator: operator},
		},
		CurrentOwner:   owner,
		ProcessingStep: initialStep,
	}

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState("batch_"+batchID, batchJSON)
}

// AddTestResult adds a test record
func (s *SmartContract) AddTestResult(ctx contractapi.TransactionContextInterface, batchID string, testResult TestResult) error {
	batch, err := s.ReadRiceBatch(ctx, batchID)
	if err != nil {
		return err
	}
	batch.TestResults = append(batch.TestResults, testResult)

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState("batch_"+batchID, batchJSON)
}

// TransferRiceBatch transfers ownership
func (s *SmartContract) TransferRiceBatch(ctx contractapi.TransactionContextInterface, batchID, newOwner, operator string) error {
	batch, err := s.ReadRiceBatch(ctx, batchID)
	if err != nil {
		return err
	}
	now := time.Now().Format(time.RFC3339)
	oldOwner := batch.CurrentOwner
	batch.OwnerHistory = append(batch.OwnerHistory, OwnerTransfer{
		From:      oldOwner,
		To:        newOwner,
		Timestamp: now,
	})
	batch.CurrentOwner = newOwner

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState("batch_"+batchID, batchJSON)
}

// AddProcessingRecord adds a process step
func (s *SmartContract) AddProcessingRecord(ctx contractapi.TransactionContextInterface, batchID, step, operator string) error {
	batch, err := s.ReadRiceBatch(ctx, batchID)
	if err != nil {
		return err
	}
	now := time.Now().Format(time.RFC3339)
	batch.ProcessHistory = append(batch.ProcessHistory, ProcessingRecord{
		Step:      step,
		Timestamp: now,
		Operator:  operator,
	})
	batch.ProcessingStep = step

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState("batch_"+batchID, batchJSON)
}

// CreateProduct creates a product linked to a batch
func (s *SmartContract) CreateProduct(ctx contractapi.TransactionContextInterface, productID, batchID, packageDate, owner string) error {
	exists, err := ctx.GetStub().GetState("product_" + productID)
	if err != nil {
		return err
	}
	if exists != nil {
		return fmt.Errorf("product %s already exists", productID)
	}

	batchExists, err := s.RiceBatchExists(ctx, batchID)
	if err != nil {
		return err
	}
	if !batchExists {
		return fmt.Errorf("batch %s does not exist", batchID)
	}

	product := Product{
		DocType:     "product",
		ProductID:   productID,
		BatchID:     batchID,
		PackageDate: packageDate,
		Owner:       owner,
	}

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState("product_"+productID, productJSON)
}

type ProductWithBatch struct {
	Product *Product   `json:"product"`
	Batch   *RiceBatch `json:"batch"`
}

// ReadProduct returns product info and linked batch info
func (s *SmartContract) ReadProduct(ctx contractapi.TransactionContextInterface, productID string) (*ProductWithBatch, error) {
	productJSON, err := ctx.GetStub().GetState("product_" + productID)
	if err != nil {
		return nil, fmt.Errorf("failed to read product: %v", err)
	}
	if productJSON == nil {
		return nil, fmt.Errorf("product %s does not exist", productID)
	}

	var product Product
	err = json.Unmarshal(productJSON, &product)
	if err != nil {
		return nil, err
	}

	batch, err := s.ReadRiceBatch(ctx, product.BatchID)
	if err != nil {
		return nil, fmt.Errorf("failed to read linked batch: %v", err)
	}

	return &ProductWithBatch{Product: &product, Batch: batch}, nil
}

// ReadRiceBatch returns a batch by ID
func (s *SmartContract) ReadRiceBatch(ctx contractapi.TransactionContextInterface, batchID string) (*RiceBatch, error) {
	batchJSON, err := ctx.GetStub().GetState("batch_" + batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to read batch: %v", err)
	}
	if batchJSON == nil {
		return nil, fmt.Errorf("the rice batch %s does not exist", batchID)
	}

	var batch RiceBatch
	if err := json.Unmarshal(batchJSON, &batch); err != nil {
		return nil, err
	}
	return &batch, nil
}

// RiceBatchExists checks if a batch exists
func (s *SmartContract) RiceBatchExists(ctx contractapi.TransactionContextInterface, batchID string) (bool, error) {
	batchJSON, err := ctx.GetStub().GetState("batch_" + batchID)
	if err != nil {
		return false, err
	}
	return batchJSON != nil, nil
}

// GetAllRiceBatches returns all rice batches
func (s *SmartContract) GetAllRiceBatches(ctx contractapi.TransactionContextInterface) ([]*RiceBatch, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("batch_", "batch_\uffff")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var batches []*RiceBatch
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var batch RiceBatch
		if err := json.Unmarshal(queryResponse.Value, &batch); err != nil {
			continue
		}
		if batch.BatchID == "" {
			continue
		}
		batches = append(batches, &batch)
	}
	return batches, nil
}
