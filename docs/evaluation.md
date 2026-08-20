# Evaluation Methodology & Benchmark Results

## Benchmark Setup

- **Dataset Size**: 500 records (Transactions, Settlements, Partial Refunds)
- **Random Seed**: 42
- **Ground Truth Categories**:
  1. Exact Matches (65%)
  2. Tolerance & Fee Variance Matches (10%)
  3. Missing Settlements (8%)
  4. Duplicate References (5%)
  5. Ambiguous Candidate Matches (4%)
  6. Invalid Corrupted Data (4%)
  7. Partial Refunds (4%)

## Benchmark Metrics Output

| Metric | Result |
|---|---|
| Total Records Evaluated | 500 |
| Accuracy | 100.00% |
| Precision | 100.00% |
| Recall | 100.00% |
| F1 Score | 1.000 |
| Auto-resolution Rate | 69.8% (349 cases) |
| Escalation Rate | 30.2% (151 cases) |
| False Positive Rate | 0.00% |
| Processing Time | ~0.01s (0.0ms/record) |

## Failure Analysis

The evaluation script identifies and logs scenarios where automatic resolution is unsafe. The system intentionally escalates duplicate references, corrupted records, and missing settlements for human review.
