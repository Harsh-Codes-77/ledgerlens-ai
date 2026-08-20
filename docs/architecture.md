# LedgerLens AI — System & Pipeline Architecture

## System Overview

LedgerLens AI is built as a production-quality, monorepo financial reconciliation platform designed for Razorpay Buildathon — Track 4: AI Finance Controller.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 NEXT.JS DASHBOARD APP (WEB)                            │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬────────┐ │
│  │   Overview   │   Batches    │  Exceptions  │ Transactions │ Audit Logs   │ Eval   │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴────────┘ │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ REST API / JSON
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                 FASTAPI BACKEND SERVICE (API)                          │
│  ┌───────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────┐ │
│  │ Reconciliation Engine │  │ Exception Investigator  │  │   Evaluation Pipeline    │ │
│  │ • Stage 1 Validation   │  │ • AI Provider Layer     │  │ • Ground-truth Matcher   │ │
│  │ • Stage 2 Exact Match  │  │   (Groq/OpenAI/Gemini/  │  │ • Accuracy, Precision,   │ │
│  │ • Stage 3 Tolerance    │  │    Mock)                │  │   Recall, F1 Score       │ │
│  │ • Stage 4 Candidates   │  │ • Structured JSON       │  │ • Failure Case Analysis  │ │
│  │ • Stage 5 Scoring      │  │ • Strict Safety Rules   │  └──────────────────────────┘ │
│  └───────────────────────┘  └─────────────────────────┘                             │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ SQLAlchemy ORM
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                 POSTGRESQL / SQLITE DATABASE                           │
│  Transactions │ Settlements │ Refunds │ Rec Results │ Exception Cases │ Audit Logs   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Key Architectural Principles

1. **Separation of Deterministic Rules and AI**:
   - Matching, tolerances, duplicate detection, and validation are strictly performed by the deterministic algorithm.
   - LLMs are invoked only to investigate unmatched/ambiguous exceptions and summarize evidence.

2. **Provider Agnostic AI Integration**:
   - Implements a flexible provider interface (`AIProvider`) supporting Groq, OpenAI, Gemini, and a standalone zero-dependency Mock provider.

3. **Strict Safety Policy & Fallback System**:
   - Automatic resolution requires `confidence >= 0.95` and passed validation.
   - Any AI API timeout, invalid JSON, or ambiguous match immediately triggers human review fallback without crashing the batch.
