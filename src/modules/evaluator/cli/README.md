# Evaluator CLI Entry Points

This directory contains CLI entry points for evaluator-related operations.

## Available CLI Tools

### 1. Course Retriever Evaluator CLI

**File:** `course-retriever-evaluator.cli.ts`

Runs evaluation on course retriever performance using predefined test sets.

```bash
# Show help
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/entries/course-retriever-evaluator.cli.ts --help

# List available test sets
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/entries/course-retriever-evaluator.cli.ts --list

# List query-log IDs (useful for building test sets)
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/entries/course-retriever-evaluator.cli.ts --list-ids

# Run test-set-v1 with iteration 1
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/entries/course-retriever-evaluator.cli.ts

# Run test-set-v2 with iteration 3
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/entries/course-retriever-evaluator.cli.ts \
  --test-set test-set-v2 --iteration 3
```

---

### 2. Test Set Builder CLI

**File:** `test-set-builder.cli.ts`

Builds test sets from query logs by extracting raw data from enriched logs.

```bash
# Show help
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/entries/test-set-builder.cli.ts --help

# List available steps
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/entries/test-set-builder.cli.ts --list-steps

# List available query-log IDs
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/entries/test-set-builder.cli.ts --list

# Build skill expansion test set
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/entries/test-set-builder.cli.ts \
  --step skill-expansion --ids log-id-1

# Build classification test set with multiple IDs
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/entries/test-set-builder.cli.ts \
  --step classification --ids log-id-1,log-id-2 --output my-test-set.json
```

#### Available Steps

| Step Key | Step Name | Description |
|----------|-----------|-------------|
| `skill-expansion` | SKILL_EXPANSION | Extract skills from questions |
| `classification` | QUESTION_CLASSIFICATION | Classify question relevance |
| `course-retrieval` | COURSE_RETRIEVAL | Retrieve relevant courses |
| `course-filter` | COURSE_RELEVANCE_FILTER | Filter courses by relevance |
| `course-aggregation` | COURSE_AGGREGATION | Aggregate ranked courses |
| `answer-synthesis` | ANSWER_SYNTHESIS | Generate contextual answers |

---

## Output Location

Test sets are exported to `data/evaluation/test-sets/` with timestamps:
- `test-set-<step>-<timestamp>.json`

Example: `data/evaluation/test-sets/test-set-skill-expansion-1736275200000.json`
