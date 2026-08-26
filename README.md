# LedgerLens AI

**Autonomous financial reconciliation with intelligent exception investigation.**

Built for **Razorpay Buildathon — Track 4: AI Finance Controller**.

---

## 🎯 Executive Summary & Core Principle

Financial operations teams manually reconcile transactions, settlements, and bank records across disparate systems. 

**LedgerLens AI** solves this by strictly separating **Deterministic Matching** from **AI Exception Investigation**:
- **Deterministic Engine**: Handles transaction ID matching, fee variance tolerances, partial refund adjustments, date windows, and duplicate detection with 100% mathematical accuracy.
- **AI Investigator**: Invoked only for ambiguous exceptions. It analyzes structured evidence, calculates confidence scores, automatically resolves safe cases (`confidence >= 0.95`), and escalates uncertain ones with clear reasoning for human review.

---

## 📐 Overall System Architecture & Engine Flowchart

```mermaid
graph TD
    SubGraph1[Data Ingestion Layer] -->|Raw Records| Stage1[Stage 1: Validation Engine]
    
    subgraph Deterministic Core Pipeline
        Stage1 -->|Valid Records| Stage2[Stage 2: Exact Match Engine]
        Stage1 -->|Corrupted/Negative| InvalidExc[Invalid Data Exception]
        
        Stage2 -->|Matched| AutoRes1[Status: MATCHED / AUTO_RESOLVE]
        Stage2 -->|Unmatched| Stage3[Stage 3: Tolerance & Refund Engine]
        
        Stage3 -->|Fee/Refund Match| AutoRes2[Status: MATCHED / TOLERANCE]
        Stage3 -->|Unmatched| Stage4[Stage 4: Candidate Match & Duplicate Search]
        
        Stage4 -->|Multiple Candidates| AmbigExc[Ambiguous Match Exception]
        Stage4 -->|Zero Candidates| MissingExc[Missing Settlement Exception]
    end

    subgraph AI Exception Investigator
        InvalidExc --> AIPayload[Gather Grounded Evidence Payload]
        AmbigExc --> AIPayload
        MissingExc --> AIPayload
        
        AIPayload --> AIModel{Configured AI Provider<br/>Groq / OpenAI / Gemini / Mock}
        AIModel -->|JSON Response| AISafety{Confidence >= 0.95?}
        
        AISafety -- Yes --> AutoRes3[AUTO_RESOLVED]
        AISafety -- No --> HumanQueue[ESCALATE TO HUMAN REVIEW]
        AIModel -->|Timeout / Error| Fallback[HUMAN REVIEW FALLBACK]
    end

    AutoRes1 --> Audit[Immutable Audit Trail]
    AutoRes2 --> Audit
    AutoRes3 --> Audit
    HumanQueue --> Audit
    Fallback --> Audit
```

---

## 🖥 PAGE-BY-PAGE WORKFLOWS & FLOWCHARTS

### 1. Overview Dashboard (`/`)

The Overview page serves as the mission control for finance controllers, displaying real-time batch statistics, system health, match rates, and active exceptions.

```mermaid
flowchart LR
    A[User Opens Overview Page] --> B[Fetch Batches & Exceptions from API]
    B --> C[Display Key Performance Indicators]
    C --> C1[Total Processed Records]
    C --> C2[Overall Match Rate %]
    C --> C3[Auto-Resolved Count]
    C --> C4[Pending Review Count]
    
    B --> D[Render Recent Batches Table]
    B --> E[Render Unresolved Exceptions Queue]
    
    F[User Clicks 'Run 500-Record Demo Batch'] --> G[Trigger API POST /api/batches]
    G --> H[Generate 500 Synthetic Records]
    H --> I[Execute Multi-Stage Recon Engine]
    I --> J[Refresh Dashboard Metrics]
```

**Key Features**:
- Live performance counters (Match Rate, Auto-Resolved vs Escalated).
- One-click **Run 500-Record Demo Batch** trigger.
- Quick navigation to active exception cases and recent batch execution logs.

---

### 2. Batch Processing & Detail Workspace (`/batches` & `/batches/[id]`)

Allows users to create reconciliation batches, run batch execution, and inspect exact matching outputs.

```mermaid
flowchart TD
    A[User Enters Batches Page] --> B[Input Batch Name & Click Run]
    B --> C[API Creates Batch Record]
    C --> D[Ingest Transactions, Settlements, & Refunds]
    D --> E[Reconciliation Engine Process Batch]
    
    subgraph Stage Execution
        E --> S1[Validate Required Fields & Amount Positivity]
        S1 --> S2[Match Exact Payment References & Amounts]
        S2 --> S3[Match Fee Tolerances e.g. ±2% & Partial Refunds]
        S3 --> S4[Calculate Confidence Scores 0.0 - 1.0]
    end
    
    E --> F[Persist Results & Update Batch Metadata]
    F --> G[Navigate to Batch Detail /batches/id]
    G --> H[Display Execution Breakdown: Matched vs Escalated]
```

**Key Features**:
- Custom batch creation with synthetic dataset generation (500 records with 10 test scenarios).
- Batch Detail page displaying record-by-record match type (`EXACT`, `TOLERANCE`, `AMBIGUOUS`), confidence score, amount variance, and decision.

---

### 3. Exceptions Queue & AI Investigation Workspace (`/exceptions` & `/exceptions/[id]`)

The core workspace for investigating unmatched, ambiguous, or fee-mismatched cases.

```mermaid
flowchart TD
    A[User Selects Exception from Queue] --> B[Load Exception Detail /exceptions/id]
    B --> C[Fetch Transaction Data & Candidate Matches]
    B --> D[Display AI Grounded Investigation Report]
    
    subgraph AI Investigation Details
        D --> D1[Summary & Likely Root Cause]
        D --> D2[Evidence Bullet Points]
        D --> D3[AI Confidence Gauge %]
        D --> D4[Deterministic Rule Pass/Fail Checklist]
    end
    
    E[Finance Controller Review] --> ActionChoice{Operator Action}
    
    ActionChoice -- Approve --> F[POST /api/exceptions/id/approve]
    ActionChoice -- Reject --> G[POST /api/exceptions/id/reject]
    ActionChoice -- Escalate --> H[POST /api/exceptions/id/escalate]
    
    F --> I[Update Case Status to APPROVED]
    G --> J[Update Case Status to REJECTED]
    H --> K[Update Case Status to ESCALATED]
    
    I --> L[Write Action to Immutable Audit Log]
    J --> L
    K --> L
```

**Key Features**:
- Multi-criteria queue filtering (by status: `PENDING_REVIEW`, `ESCALATED`, `APPROVED`, or type: `amount_mismatch`, `missing_settlement`, `duplicate_reference`).
- **Grounded Evidence Panel**: AI-generated root cause explanations based strictly on record data.
- **Deterministic Rule Checklist**: Visual pass/fail status for Reference Match, Amount Tolerance, and Duplicate Check.
- **Human Decision Buttons**: Approve Resolution, Reject Recommendation, or Escalate Case with operator resolution notes.

---

### 4. Transactions & Bank Settlements Registries (`/transactions` & `/settlements`)

Searchable, high-density data tables displaying raw ingested transaction feeds and bank settlement records.

```mermaid
flowchart LR
    A[User Opens Registry] --> B[Fetch Feeds from /api/transactions or /api/settlements]
    B --> C[Render Monochromatic Data Table]
    C --> C1[External Transaction ID / Settlement ID]
    C --> C2[Source e.g. Razorpay, Stripe, Bank HDFC]
    C --> C3[Amount, Currency & Status]
    C --> C4[Payment Reference & Timestamps]
```

---

### 5. Audit Log Timeline (`/audit-log`)

Provides a complete, immutable audit trail of system, AI, and human actions for compliance and oversight.

```mermaid
flowchart TD
    A[System Event Triggered] --> B{Actor Type}
    B -- System --> C[Log RECONCILE / INGEST Action]
    B -- AI --> D[Log AI_INVESTIGATE Action + Model Output]
    B -- User --> E[Log HUMAN_APPROVE / HUMAN_REJECT Action]
    
    C --> F[Persist in AuditLog Table]
    D --> F
    E --> F
    
    F --> G[Render Audit Log Page /audit-log]
    G --> H[Display Event Timeline with Actor Badge & Timestamps]
```

---

### 6. Evaluation & Benchmark Dashboard (`/evaluation`)

Demonstrates system accuracy and transparency by evaluating predicted reconciliation results against ground-truth dataset annotations.

```mermaid
flowchart LR
    A[User Opens Evaluation Page] --> B[Fetch Evaluation Metrics from /api/evaluation/batch_id]
    B --> C[Display Metrics Summary]
    C --> C1[Dataset Size: 500 Records]
    C --> C2[Match Accuracy: 100.0%]
    C --> C3["Precision: 100.0% - Recall: 100.0% - F1: 1.000"]
    C --> C4[Auto-Resolution Rate: 69.8%]
    C --> C5[Escalation Rate: 30.2%]
    
    B --> D[Render Known Failure Analysis Table]
    D --> D1["Duplicate Bank Callbacks -> Escalated"]
    D --> D2["Corrupted Negative Amounts -> Invalid Exception"]
    D --> D3["Missing Settlements -> AI Investigated & Escalated"]
```

---

## 🛠 Tech Stack & Environment Setup

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy
- **Database**: PostgreSQL / SQLite fallback
- **AI Providers**: Groq (`llama-3.3-70b-versatile`), OpenAI, Gemini, Standalone Mock Provider
- **Testing**: Pytest

### Quick Start Commands

```bash
# Setup backend dependencies
make setup

# Generate synthetic 500-record dataset with ground-truth
make generate-data

# Run Pytest suite
make test

# Run evaluation suite
make run-eval

# Start API Backend (Port 8000)
make run-api

# Start Web Dashboard (Port 3005)
make run-web
```

---

## 📄 Complete Project Documentation

- [Architecture Guide](docs/architecture.md)
- [Architectural Decision Records (ADRs)](docs/decisions.md)
- [Evaluation Methodology](docs/evaluation.md)
