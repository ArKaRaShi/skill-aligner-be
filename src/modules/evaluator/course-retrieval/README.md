# Course Retrieval Evaluator

Evaluates the quality of course retrieval using LLM-as-judge methodology.

## Overview

The Course Retrieval Evaluator assesses how well the system retrieves relevant courses for a given skill. It uses an LLM judge to score retrieved courses on a graded relevance scale (0-3).

**Architecture:**
```
Question + Skill → Course Retrieval → Retrieved Courses
                                        ↓
                              LLM Judge Evaluation
                                        ↓
                        Relevance Scores (0-3) + Metrics
```

## Evaluation Model

### Relevance Scale

| Score | Label | Description |
|-------|-------|-------------|
| **3** | Highly Relevant | Directly addresses the skill/concept |
| **2** | Fairly Relevant | Related content, partially useful |
| **1** | Marginally Relevant | Tangentially related, limited value |
| **0** | Irrelevant | No meaningful connection |

### Judge Prompt

The judge evaluates each retrieved course based on:
- Course name and subject code
- Cleaned learning outcomes
- Relevance to the target skill

See `prompts/course-retriever.evaluator.prompt.ts` for the full prompt.

## Metrics

### Basic Metrics

| Metric | Description | Formula |
|--------|-------------|---------|
| `totalCourses` | Number of courses evaluated | Count |
| `averageRelevance` | Mean relevance score (0-3) | Σ scores / n |
| `highlyRelevantRate` | % of score 3 courses | count(3) / n × 100 |
| `irrelevantRate` | % of score 0 courses | count(0) / n × 100 |

### ⚠️ Proxy Metrics (NDCG and Precision)

**Important: These are proxy metrics using LLM judge scores as relevance.**

#### NDCG (Normalized Discounted Cumulative Gain)

Measures ranking quality using graded relevance scores.

```
NDCG@K = DCG@K / IDCG@K

DCG@K  = Σ (relevance_i / log₂(position + 2))
IDCG@K = DCG of scores sorted descending (ideal ranking)
```

**Values:** 0-1, where 1 = perfect ranking

**Proxy Notice:**
- Without ground truth labels, IDCG is calculated from the ideal ranking of the **judge's own scores** (sorted descending), not from perfect ground truth
- This measures: "How close is the actual ranking to the ideal ranking according to the judge?"
- NDCG@10 = 0.85 means: Top 10 results achieve 85% of the ideal ranking (as judged by the LLM)

#### Precision@K

Measures precision at cut-off positions using binary relevance.

```
Precision@K = (count of scores ≥ 2 in top K) / K
```

**Values:** 0-1, where 1 = all top K courses are relevant

**Proxy Notice:**
- "Relevant" is defined as score ≥ 2 (fairly or highly relevant)
- Without ground truth, we **cannot calculate true Recall or F1**
- Precision@10 = 0.70 means: 7 out of 10 top courses are relevant (score ≥ 2)

### Metric Interpretation

| NDCG@10 | Quality Level | Presentation Line |
|---------|--------------|-------------------|
| ≥ 0.9 | Excellent | "Near-perfect ranking" |
| 0.7-0.9 | Good | "Strong ranking quality" |
| 0.5-0.7 | Fair | "Acceptable, room for improvement" |
| < 0.5 | Poor | "Needs significant work" |

| Precision@10 | Quality Level | Presentation Line |
|--------------|--------------|-------------------|
| ≥ 0.8 | Excellent | "80% of top 10 are relevant" |
| 0.6-0.8 | Good | "Most top results are relevant" |
| 0.4-0.6 | Fair | "Mixed relevance in top results" |
| < 0.4 | Poor | "Few top results are relevant" |

## Usage

### CLI Command

```bash
bun run cli evaluator:course-retriever
```

### Test Sets

Test sets are versioned collections of test cases:

```typescript
const testSet: CourseRetrieverTestSet = {
  version: 1,
  name: 'test-set-v1',
  description: 'Initial test set for course retrieval',
  cases: [
    {
      id: 'v1-001',
      question: 'How do I learn web development?',
      skill: 'web development',
      retrievedCourses: [...],
    },
    // ... more cases
  ],
};
```

### Running Evaluations

```typescript
import { CourseRetrieverEvaluator } from './evaluators/course-retriever.evaluator';

const evaluator = new CourseRetrieverEvaluator();

const output = await evaluator.evaluate({
  question: 'How do I learn Python?',
  skill: 'Python programming',
  retrievedCourses: [
    {
      subjectCode: 'CS101',
      subjectName: 'Introduction to Programming',
      cleanedLearningOutcomes: ['Learn basic programming concepts', ...],
    },
    // ... more courses
  ],
});

console.log(`NDCG@10: ${output.metrics.ndcg.at10.toFixed(2)}`);
console.log(`Precision@10: ${output.metrics.precision.at10.toFixed(2)}`);
```

## File Structure

```
course-retrieval/
├── evaluators/           # Judge orchestration
│   └── course-retriever.evaluator.ts
├── helpers/              # Metric calculation helpers
│   ├── ndcg-calculator.helper.ts
│   ├── precision-calculator.helper.ts
│   └── course-mapper.helper.ts
├── loaders/              # Test set loading
│   └── course-retrieval-test-set-loader.service.ts
├── prompts/              # LLM judge prompts
│   └── course-retriever.evaluator.prompt.ts
├── schemas/              # Zod validation schemas
│   └── schema.ts
├── services/             # Business logic
│   ├── course-retrieval-comparison.service.ts
│   └── course-retrieval-metrics-calculator.service.ts
├── types/                # TypeScript types
│   └── course-retrieval.types.ts
└── utils/                # Utility functions
    └── course-retrieval-hash.util.ts
```

## References

- **NDCG:** [Wikipedia - Discounted Cumulative Gain](https://en.wikipedia.org/wiki/Discounted_cumulative_gain)
- **Precision@K:** Standard information retrieval metric
- **LLM-as-Judge:** Using LLMs to evaluate retrieval quality

## Limitations

1. **Proxy Metrics:** Without ground truth, NDCG and Precision rely on LLM judge scores, not human-annotated relevance
2. **Judge Quality:** Metrics are only as good as the LLM judge's consistency
3. **No True Recall:** Cannot calculate recall without knowing total relevant courses in database
4. **Context-Dependent:** Relevance is subjective and depends on the specific question/skill context
