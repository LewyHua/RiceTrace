# Rice Traceability System - Project Overview

Rice Tracer is a Hyperledger Fabric-based rice traceability system that supports three roles: farmers, processors, and consumers, enabling full-process tracking of rice batches, processing, quality inspection, and products.

---

## Core Technology Stack

-   **Blockchain**: Hyperledger Fabric v2.x + TypeScript Smart Contracts
-   **Middleware**: Node.js + Express + TypeScript
-   **Database**: Supabase (PostgreSQL + Cloudflare R2 Storage Bucket)
-   **SDK**: @hyperledger/fabric-gateway
-   **Development**: TypeScript/JavaScript ES6+

---

## Project Structure

```
RiceTrace/
├── fabric-samples/
│   ├── test-network/           # Fabric Test Network configurations
│   └── asset-transfer-basic/
│       ├── my-ts/              # TypeScript Smart Contracts
│       │   └── src/
│       │       ├── riceTracerContract.ts  # Main contract
│       │       ├── types.ts               # Data type definitions
│       │       └── index.ts               # Contract entry point
│       └── my-js/              # Node.js Middleware API & Frontend
│           ├── src/                      # Backend source code (Controllers, Services, DAO)
│           │   ├── controllers/          # Handles HTTP requests
│           │   ├── services/             # Contains business logic
│           │   ├── dao/                  # Interacts with Fabric network
│           │   ├── middleware/           # Auth and error handling middleware
│           │   └── routes/               # API route definitions
│           ├── public/                   # Static frontend files (HTML, CSS, JS)
│           ├── config.js                 # Unified configuration
│           ├── server.js                 # API server entry point
│           ├── app.js                    # API testing client (simplified)
│           └── package.json              # Project dependencies and scripts
└── README.md                   # This project overview document
```

---

## Quick Start

### 1. Environment Requirements

-   Node.js >= 18
-   Docker
-   TypeScript (included in dev dependencies)
-   For detailed prerequisites, refer to the [Hyperledger Fabric Prerequisites](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html). After fulfilling all prerequisites, execute `./install-fabric.sh` to set up the Fabric network.

### 2. Start Fabric Network and Smart Contracts (Backend)

Execute in the `RiceTrace` project root directory:

```bash
./start_backend_ts.sh
```

### 3. Install and Start Middleware API Service (Frontend/Backend)

```bash
cd fabric-samples/asset-transfer-basic/my-js
npm install
npm start
```

### 4. Access Services

-   **API Documentation**: `http://localhost:3000/api/info`
-   **Health Check**: `http://localhost:3000/api/health`
-   **Frontend Interface**: `http://localhost:3000/`

---

## Middleware API Reference (`my-js`)

### 1. Architecture Overview

The `my-js` service adopts a three-tier architecture design:

```
my-js/
├── config.js                 # Unified configuration management
├── server.js                 # Main server entry point
├── app.js                    # API testing client (simplified)
├── src/
│   ├── controllers/          # Controller layer - handles HTTP requests
│   │   ├── batchController.js
│   │   ├── productController.js
│   │   └── reportController.js
│   ├── services/             # Service layer - processes business logic
│   │   ├── RiceService.js
│   │   ├── ProductService.js
│   │   └── ReportService.js
│   ├── dao/                  # Data Access Layer - interacts with Fabric network
│   │   └── FabricDAO.js
│   ├── middleware/           # Middleware layer
│   │   ├── authMiddleware.js    # Permission validation
│   │   └── errorMiddleware.js   # Error handling
│   └── routes/               # Route configuration
│       └── index.js
├── public/                   # Static files (frontend interface)
└── ...
```

### 2. API Endpoints Overview

| Method | Path | Permissions | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/batch` | `getAll` | Get all batches |
| POST | `/api/batch` | `create` | Create new batch (requires `reportId` in `initialTestResult` field) |
| GET | `/api/batch/:id` | `getById` | Get specified batch by ID |
| GET | `/api/batch/:id/exists` | `getById` | Check if batch exists |
| GET | `/api/batch/:id/owner` | `getById` | Get current owner of a batch |
| PUT | `/api/batch/:id/transfer` | `transfer` | Transfer batch ownership (deprecated, use `/v2/batch/:id/event`) |
| POST | `/api/batch/:id/test` | `addTest` | Add quality inspection result (supports Oracle verification) |
| POST | `/api/batch/:id/process` | `addProcess` | Add processing record |
| GET | `/api/batch/stats` | `getAll` | Get batch statistics |
| POST | `/api/v2/batch/:id/event` | `transfer` | Unified endpoint to complete a step and transfer a batch |
| POST | `/api/product` | `createProduct` | Create product |
| GET | `/api/product/:id` | `getProduct` | Get product information by ID |
| GET | `/api/product/:id/exists` | `getProduct` | Check if product exists |
| GET | `/api/product/:id/traceability` | `getProduct` | Get product traceability information |
| POST | `/api/reports/upload` | Any role | Upload quality inspection report file |
| GET | `/api/reports/my` | Any role | Get current user's report list |
| GET | `/api/reports/status` | Any role | Get report service status |
| GET | `/api/reports/:reportId/verify` | Any role | Verify report (for debugging) |
| GET | `/api/reports/:reportId` | Any role | Get report details by ID |
| POST | `/api/reports/admin/update-status` | `admin` | Admin updates report status (for dev/testing only) |
| GET | `/api/oracle/status` | Any role | Get Oracle service status |
| GET | `/api/health` | Any role | System health check |
| GET | `/api/info` | Any role | API information and available endpoints |

### 3. Permission System

The system supports multiple roles, each with different API permissions, specified via the `X-User-Role` HTTP request header or a `?role=` URL parameter.

-   **farmer**: Create batch, view information
-   **processor**: Transfer batch, add quality inspection, create product
-   **consumer**: View batch and product information
-   **admin**: (For development/testing only) Review reports

Example:
```bash
curl -H "X-User-Role: farmer" http://localhost:3000/api/batch
```

### 4. Request Examples

#### Create Batch (Farmer Permission)

Requires `reportId` within the `initialTestResult` field.

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -H "X-User-Role: farmer" \
  -d '{
    "reportId": "your-approved-report-id",
    "location": "Heilongjiang Wuchang",
    "variety": "Daohuaxiang",
    "harvestDate": "2024-10-15",
    "owner": "Zhangsan Farm",
    "initialTestResult": {
      "reportId": "report-123",
      "reportType": "Initial Quality Inspection",
      "summary": "Initial harvest quality meets standards",
      "isVerified": true,
      "verificationSource": "Oracle",
      "fileHash": "a1b2c3d4e5f6g7h8",
      "tester": "Li Si",
      "testDate": "2024-10-16T10:00:00Z",
      "laboratory": "Wuchang Lab",
      "certificationNumber": "CERT-2024-001",
      "notes": "Initial inspection passed."
    },
    "initialStep": "Harvest Completed",
    "operator": "Zhangsan"
  }'
```

#### Unified Step Completion & Batch Transfer (Processor Permission)

This new endpoint unifies transfer, quality inspection, and processing records.

```bash
curl -X POST http://localhost:3000/api/v2/batch/batch_12345/event \
  -H "Content-Type: application/json" \
  -H "X-User-Role: processor" \
  -d '{
    "fromOperator": "ABC Processing Plant",
    "toOperator": "XYZ Warehouse",
    "step": "Warehousing",
    "reportId": "report-456"
  }'
```

#### Upload Quality Inspection Report (Any Role)

```bash
curl -X POST http://localhost:3000/api/reports/upload \
  -H "X-User-Role: farmer" \
  -F "report=@/path/to/your/quality_report.pdf"
```

#### Review Quality Report (Admin Permission - Dev/Testing Only)

```bash
curl -X POST http://localhost:3000/api/reports/admin/update-status \
  -H "Content-Type: application/json" \
  -H "X-User-Role: admin" \
  -d '{"reportId": "your-report-id", "status": "APPROVED"}'
```

---

## Oracle Service and Quality Report System

### 1. Overview

The Oracle service integration allows the system to verify quality inspection reports from external authoritative data sources, ensuring the credibility of on-chain data. In the MVP phase, the Oracle directly calls the internal `ReportService` for verification, without external HTTP requests.

### 2. Database Design (`Supabase`)

**`quality_reports` Table Structure**:

```sql
CREATE TABLE quality_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_hash TEXT NOT NULL,              -- SHA-256 file hash
  file_name TEXT NOT NULL,              -- Original file name
  file_url TEXT NOT NULL,               -- R2 access URL
  file_key TEXT NOT NULL,               -- R2 storage key
  status TEXT DEFAULT 'PENDING'         -- Review status (PENDING, APPROVED, REJECTED)
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  uploaded_by TEXT,                     -- Uploader role
  uploader_id TEXT,                     -- Uploader ID
  content_type TEXT,                    -- MIME type
  file_size BIGINT                      -- File size
);
```

### 3. On-chain Data Structure Extension (`my-ts/src/types.ts`)

The `TestResult` type in the smart contract has been extended to include Oracle verification related fields:

```typescript
export class TestResult {
  // ... existing fields

  // Oracle verification related fields
  public isVerified: boolean = false;
  public verificationSource?: string;
  public externalReportId?: string;
  public fileHash?: string;
  public tester?: string;
  public testDate?: string;
  public laboratory?: string;
  public certificationNumber?: string;
  public notes?: string;
}
```

---

## Frontend Interface (`public/`)

The frontend uses simple static HTML pages and interacts with the backend API via JavaScript.

-   **Home Page**: `index.html` (role selection, quick entry)
-   **Upload Report**: `upload-report.html`
-   **Report Review**: `admin-reports.html` (for development/testing, provides convenient report review functionality)
-   **Create Batch**: `create.html`
-   **Static Assets**: `style.css` (simplified style, no advanced effects, prioritizing functionality and stability), `common.js` (API request encapsulation, UI rendering helpers)

**Quality Inspection Record Display Optimization**:
-   In `index.html` (which now handles batch details), quality inspection records use a card-like layout to avoid excessively long table content.
-   Long text (e.g., file hashes, report content) is automatically truncated with ellipses.
-   Statuses (PASSED/FAILED) are color-coded for improved readability.

---

## Environment Configuration

### Required Environment Variables (`.env` file or system environment variables)

Create a `.env` file in the `fabric-samples/asset-transfer-basic/my-js` directory:

```dotenv
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Cloudflare R2 Configuration
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_BUCKET_NAME=your-bucket-name

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Other Configurations
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

---

## Development Guide

### Adding New Business Features

1.  Add new methods to the smart contract (`my-ts/src/riceTracerContract.ts`).
2.  Update the service layer (`src/services/`) to handle business logic.
3.  Create or update the controller (`src/controllers/`) to handle HTTP requests.
4.  Configure routes (`src/routes/index.js`).
5.  Update permission configuration (`config.js`).
6.  Update frontend pages to support new features.

### Error Handling

-   The system uses a unified error handling mechanism, with business errors using predefined error codes.
-   All errors have a standardized response format.
-   Detailed error messages are supported in development environments.
-   When a report fails review, user-friendly error messages are provided (e.g., "Report is pending review", "Report has been rejected").

### Logging System

-   Request logs: Records all HTTP requests.
-   Operation logs: Records user operations and results.
-   Error logs: Records detailed error information and stack traces.

---

## Testing and Deployment

### 1. Running Tests

In the `fabric-samples/asset-transfer-basic/my-js` directory:

```bash
npm start

# In another terminal, test different role functionalities (simplified API testing client)
node app.js --role farmer      # Test farmer functions
node app.js --role processor   # Test processor functions
node app.js --role consumer    # Test consumer functions
```

**Manual Testing Steps**:
1.  Ensure the Fabric network and API server are running.
2.  Open your browser and navigate to `http://localhost:3000`.
3.  Click the **"Upload Quality Report"** button and upload a file.
4.  Click the **"Review Reports"** button (purple), find the newly uploaded report in the list, and click **"Approve"**.
5.  Click the **"Farmer"** or **"Processor/Inspector"** button to enter the corresponding role page.
6.  Attempt to **"Create New Batch"** or initiate a **"Transfer & Process"** operation, and enter the newly approved report ID.
7.  Click the **"Consumer"** button to query batch details and observe the optimized quality inspection record display.


