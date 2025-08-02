# RiceTracerContract Tests

## Purpose

This directory contains tests for the `RiceTracerContract` smart contract:
- Unit tests for all contract functions
- Integration tests for complete supply chain flow
- Permission and error handling validation

## How to Run Tests

### Install dependencies
```bash
npm install
```

### Run all tests
```bash
npm test
```

### Run with coverage report
```bash
npm run test:coverage
```

### Run specific test files
```bash
# Unit tests only
npx jest riceTracerContract.test.ts

# Integration tests only
npx jest integration.test.ts
```
