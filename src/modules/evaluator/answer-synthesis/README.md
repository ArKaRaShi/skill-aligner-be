# Answer Synthesis Evaluation

**LLM-as-a-Judge** evaluation framework for assessing the quality of generated answers in the RAG-based course recommendation system.

## Purpose

This module evaluates how well the answer synthesis system generates responses that are:

1. **Faithful** - accurate and grounded in retrieved context (no hallucinations)
2. **Complete** - provide clear reasoning that connects courses to user needs

## Evaluation Framework

### Two-Dimensional Scoring

The judge evaluates answers on **two independent axes**:

| Dimension        | Purpose                                | Scale | Focus                        |
| ---------------- | -------------------------------------- | ----- | ---------------------------- |
| **Faithfulness** | Safety check (hallucination detection) | 1-5   | Accuracy & context grounding |
| **Completeness** | Quality check (explanatory adequacy)   | 1-5   | Logical bridging & reasoning |

### Why Two Dimensions?

```
Faithfulness ≠ Completeness
```

An answer can be:

- **High Faithfulness, Low Completeness**: Accurate but unhelpful (just lists facts)
- **Low Faithfulness, High Completeness**: Persuasive but hallucinated
- **High on Both**: The ideal - accurate AND helpful

### Faithfulness Rubric (Safety Check)

**Measures**: Does the answer stick to the provided context?

| Score | Label            | Description                                       |
| ----- | ---------------- | ------------------------------------------------- |
| 5     | Perfect          | Fully supported by context. NO outside info used. |
| 4     | Mostly True      | Factually accurate, misses minor context nuances. |
| 3     | Mixed            | Mix of supported facts and hallucinations.        |
| 2     | Mostly False     | Major factual errors or unsupported claims.       |
| 1     | Completely False | Contradicts context or PURE HALLUCINATION.        |

**Key Principle**: Use ONLY the provided context. Do NOT use outside knowledge.

### Completeness Rubric (Quality Check)

**Measures**: Does the answer explain WHY courses fit the user's query?

| Score | Label              | Description                                                                                                                                    |
| ----- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 5     | Excellent Bridging | Explicitly explains WHY the course fits. Connects the dots (e.g., "Course X teaches Python, which is essential for your goal of building AI"). |
| 4     | Good Explanation   | Links courses to query logically, but explanation might be slightly generic.                                                                   |
| 3     | Descriptive Only   | Simply LISTS what courses teach but FAILS to explain WHY it matters. User has to guess the connection.                                         |
| 2     | Weak               | Lists courses with VERY LITTLE context or explanation.                                                                                         |
| 1     | Fail               | Just lists course codes/names WITHOUT reasoning. Or says "No relevant courses found" when valid options existed.                               |

**Key Principle**: Did the system build a "bridge" between the user's question and the recommended courses?

## Overall Pass/Fail Criteria

```
Pass = (Faithfulness ≥ 4) AND (Completeness ≥ 4)
```

Both dimensions must score ≥ 4 to pass. A score of 3 or below on either dimension is a failure.

## Evaluation Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. TEST SET LOADER                                                 │
│     ├─ Load test cases from JSON files                            │
│     ├─ Each case: { queryLogId, question, answer, context }       │
│     └─ Context = AggregatedCourseSkills[] with matched LOs        │
├─────────────────────────────────────────────────────────────────────┤
│  2. JUDGE EVALUATOR (LLM-as-a-Judge)                               │
│     ├─ Input: question + context + answer                         │
│     ├─ Model: gpt-4o-mini (configurable)                          │
│     ├─ Output: { faithfulness: {...}, completeness: {...} }       │
│     └─ Two INDEPENDENT scores with reasoning                      │
├─────────────────────────────────────────────────────────────────────┤
│  3. COMPARISON SERVICE                                              │
│     ├─ Compare judge verdict against system answer                │
│     ├─ Calculate overall score = (faithfulness + completeness) / 2│
│     ├─ Determine pass/fail (both ≥ 4)                             │
│     └─ Return: AnswerSynthesisComparisonRecord                    │
├─────────────────────────────────────────────────────────────────────┤
│  4. METRICS CALCULATOR                                              │
│     ├─ Aggregate scores across all samples                        │
│     ├─ Calculate:                                                 │
│     │  ├─ Average faithfulness score                             │
│     │  ├─ Average completeness score                             │
│     │  ├─ Faithfulness pass rate (score ≥ 4)                     │
│     │  ├─ Completeness pass rate (score ≥ 4)                     │
│     │  └─ Overall pass rate (both ≥ 4)                           │
│     └─ Return: AnswerSynthesisMetrics                             │
├─────────────────────────────────────────────────────────────────────┤
│  5. LOW-FAITHFULNESS ANALYZER                                       │
│     ├─ Identify patterns in failures                               │
│     ├─ Categorize by failure type:                                │
│     │  ├─ Completely False (score 1)                              │
│     │  ├─ Mostly False (score 2)                                  │
│     │  ├─ Mixed (score 3)                                        │
│     │  └─ Completeness failures (scores 1-3)                     │
│     └─ Generate insights and recommendations                      │
├─────────────────────────────────────────────────────────────────────┤
│  6. RESULT MANAGER                                                  │
│     ├─ Save records to: records/records-iteration-{N}.json        │
│     ├─ Save metrics to: metrics/metrics-iteration-{N}.json        │
│     ├─ Save cost to: cost/cost-iteration-{N}.json                 │
│     ├─ Save low-faithfulness analysis                             │
│     ├─ Track progress: iteration-N/.progress.json                 │
│     └─ Aggregate final metrics across iterations                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Progress Tracking & Crash Recovery

The evaluation framework supports **crash recovery** by tracking progress at the sample level:

### How It Works

1. **Hash-based deduplication**: Each `queryLogId` is hashed to create a unique identifier
2. **Progress file**: `.progress.json` saved after EACH sample evaluation
3. **Skip completed**: On resume, samples with existing hashes are skipped
4. **No redundant API calls**: Already-evaluated samples are not re-sent to LLM

### Progress File Structure

```json
{
  "testSetName": "test-set-1",
  "iterationNumber": 1,
  "lastUpdated": "2026-01-24T15:00:00.000Z",
  "statistics": {
    "totalQuestions": 100,
    "completedQuestions": 47,
    "pendingQuestions": 53,
    "completionPercentage": 47.0
  },
  "entries": [
    {
      "hash": "a1b2c3d4...",
      "queryLogId": "ql-123",
      "question": "What courses teach Python?",
      "completedAt": "2026-01-24T14:30:00.000Z",
      "result": {
        "faithfulnessScore": 5,
        "completenessScore": 4,
        "passed": true
      }
    }
  ]
}
```

### Crash Recovery Behavior

| Scenario               | Progress File     | Records File             | Recovery Action                          |
| ---------------------- | ----------------- | ------------------------ | ---------------------------------------- |
| Crash during iteration | Partial (N of M)  | Does not exist           | Skips N completed, evaluates M-N pending |
| Clean completion       | Complete (M of M) | Saved with all M records | Skips all M, returns cached results      |

**Key Design Decision**: Progress saved incrementally, but records saved only at iteration end. This is simpler and atomic - on crash, you must re-evaluate pending samples (which is fine since they're skipped via progress).

## Output Structure

```
data/evaluation/answer-synthesis/
└── {testSetName}/
    ├── iteration-1/
    │   └── .progress.json          # Progress tracking (incremental)
    ├── records/
    │   └── records-iteration-1.json # Individual evaluation records
    ├── metrics/
    │   └── metrics-iteration-1.json  # Aggregated metrics per iteration
    ├── cost/
    │   └── cost-iteration-1.json     # Token usage and cost breakdown
    ├── low-faithfulness/
    │   └── low-faithfulness-iteration-1.json # Failure pattern analysis
    ├── final-metrics/
    │   └── final-metrics-{N}.json   # Aggregated across N iterations
    └── final-cost/
        └── final-cost-{N}.json      # Total cost across N iterations
```

## Usage

### Running Evaluations

```bash
# Build a test set from query logs
bun run cli evaluator:test-set-builder

# Run answer synthesis evaluation
bun run cli evaluator:evaluate-json
```

### Programmatic Usage

```typescript
import { AnswerSynthesisRunnerService } from './services/answer-synthesis-runner.service';

// Load test cases
const testCases = await loader.loadTestSet('test-set-1');

// Run evaluation
const result = await runner.runEvaluation({
  testCases,
  config: {
    outputDirectory: 'test-set-1',
    judgeModel: 'gpt-4o-mini',
    judgeProvider: 'openai',
    iterations: 3,
    systemPromptVersion: 'v1',
  },
});

console.log(`Evaluated ${result.records.length} samples`);
```

## Key Services

| Service                                         | Responsibility                                      |
| ----------------------------------------------- | --------------------------------------------------- |
| `AnswerSynthesisRunnerService`                  | Orchestrates the entire evaluation pipeline         |
| `AnswerSynthesisJudgeEvaluator`                 | LLM-as-a-Judge evaluation (two-dimensional scoring) |
| `AnswerSynthesisComparisonService`              | Compares judge verdict against system answer        |
| `AnswerSynthesisMetricsCalculator`              | Aggregates scores and calculates statistics         |
| `AnswerSynthesisLowFaithfulnessAnalyzerService` | Analyzes failure patterns                           |
| `AnswerSynthesisResultManagerService`           | Manages file I/O and progress tracking              |
| `AnswerSynthesisTestSetLoaderService`           | Loads test cases from JSON files                    |

## Design Decisions

### Why Two Independent Dimensions?

Traditional "accuracy" scoring conflates two different concerns:

1. **Safety** - Did the system hallucinate? (Faithfulness)
2. **Quality** - Did the system help the user? (Completeness)

By separating these, we can:

- Detect **persuasive but wrong** answers (high completeness, low faithfulness)
- Detect **accurate but useless** answers (high faithfulness, low completeness)
- Provide **actionable feedback** for prompt engineering improvements

### Why Progress Saved After Every Sample?

LLM evaluation is **slow** (~1-5 seconds per sample). File I/O is **fast** (~1-5ms). Saving progress after each sample:

- Minimizes data loss on crashes
- Has negligible performance impact
- Enables true "resume from checkpoint" behavior

### Why Hash-Based Deduplication?

Using `queryLogId` + SHA256 hashing:

- **Robust**: Survives question/answer changes
- **Fast**: O(1) lookup vs O(n) array search
- **Safe**: Collision probability ≈ 0

## Testing

Integration tests verify:

- ✅ Progress file creation from empty state
- ✅ Incremental progress saving after each sample
- ✅ Completion percentage tracking
- ✅ Skip completed samples on resume
- ✅ Load existing results when all complete
- ✅ Metrics aggregation across iterations
- ✅ Crash recovery behavior

Run tests:

```bash
bun run test:integration -- --testNamePattern="AnswerSynthesis"
```

## References

- **Judge Prompt**: `prompts/answer-synthesis-judge.prompt.ts`
- **Types**: `types/answer-synthesis.types.ts`
- **CLI**: `src/modules/evaluator/cli/`
