# Architectural Decision Records (ADRs)

## ADR 1: Deterministic Matching vs LLM Matching

### Context
Financial reconciliation requires 100% reproducible, auditable, and mathematical accuracy. LLMs are non-deterministic by nature.

### Decision
We strictly isolate LLMs to **Exception Investigation and Evidence Summarization**. All matching decisions (exact ID matching, fee variance tolerances, date window bounds) are executed deterministically.

---

## ADR 2: Standalone Mock AI Provider

### Context
Hackathon demos and evaluation pipelines must remain executable in offline or zero-API-key environments.

### Decision
Include a `MockProvider` alongside `GroqProvider`, `OpenAIProvider`, and `GeminiProvider`. The system automatically falls back to `MockProvider` if no external API key is configured.

---

## ADR 3: Monochromatic Financial Operations UI

### Context
Finance controllers need high-density, serious operational interfaces rather than flashy consumer SaaS templates.

### Decision
Use a near-black dark monochrome aesthetic with subtle gray borders, monospace typography, and restrained state colors (positive green, amber warning, muted red) strictly reserved for status indication.
