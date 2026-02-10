# Evaluator CLI Entry Points

This directory contains CLI entry points for evaluator-related operations.

## Available CLI Tools

### 1. Answer Synthesis Evaluator CLI

**File:** `evaluate-answer-synthesis.cli.ts`

Evaluates answer synthesis quality using LLM-as-a-Judge methodology with TWO-dimensional scoring (faithfulness + completeness).

**Two Modes:**

**Mode 1: Single merged file (recommended)**
```bash
# Build merged test set
bun run cli evaluator:test-set-builder \
  --step answer-synthesis-eval \
  --ids query-log-id-1,query-log-id-2 \
  --output test-set-answer-synthesis-eval.json

# Evaluate
bun run cli evaluator:answer-synthesis --test-set test-set-answer-synthesis-eval.json

# With custom options
bun run cli evaluator:answer-synthesis \
  --test-set test-set-v1.json \
  --test-set-name "my-experiment" \
  --iterations 3 \
  --judge-model "gpt-4o"
```

**Mode 2: Two separate files**
```bash
# Build separate test sets first
bun run cli evaluator:test-set-builder --step answer-synthesis --ids log-id-1 --output answers.json
bun run cli evaluator:test-set-builder --step course-aggregation --ids log-id-1 --output context.json

# Then evaluate
bun run cli evaluator:answer-synthesis \
  --answer-file answers.json \
  --context-file context.json \
  --test-set-name "my-experiment" \
  --iterations 3
```

**Key Options:**
- `--test-set <file>` - Merged test set from `--step answer-synthesis-eval` (Mode 1)
- `--answer-file <file>` - Answer synthesis test set (Mode 2)
- `--context-file <file>` - Course aggregation context set (Mode 2)
- `--iterations <n>` - Number of iterations to run (default: 1)
- `--judge-model <model>` - Judge model (default: gpt-4o-mini)
- `--test-set-name <n>` - Custom test set name for results

**Two-Dimensional Scoring:**
- **Faithfulness** (1-5): Does the answer stick to provided context? (hallucination check)
- **Completeness** (1-5): Does the answer explain WHY courses matter? (quality check)
- **Pass**: BOTH scores ≥ 4

---

### 2. Course Retriever Evaluator CLI

**File:** `course-retriever-evaluator.cli.ts`

Runs evaluation on course retriever performance using predefined test sets.

```bash
# Show help
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/cli/course-retriever-evaluator.cli.ts --help

# List available test sets
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/cli/course-retriever-evaluator.cli.ts --list

# List query-log IDs (useful for building test sets)
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/cli/course-retriever-evaluator.cli.ts --list-ids

# Run test-set-v1 with iteration 1
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/cli/course-retriever-evaluator.cli.ts

# Run test-set-v2 with iteration 3
bunx ts-node --require tsconfig-paths/register \
  src/modules/evaluator/cli/course-retriever-evaluator.cli.ts \
  --test-set test-set-v2 --iteration 3
```

---

### 3. Course Filter Evaluator CLI

**File:** `evaluate-course-filter.cli.ts`

Evaluates course relevance filter performance using LLM-as-a-Judge methodology.

```bash
# Show help
bun run cli evaluator:course-filter --help

# Load and evaluate test-set-v1.json
bun run cli evaluator:course-filter test-set-v1.json

# Evaluate with custom test set name
bun run cli evaluator:course-filter test-set-v1.json --test-set-name "my-experiment"

# Run iteration 2 with custom judge model
bun run cli evaluator:course-filter test-set-v1.json --iteration 2 --judge-model "gpt-4o"
```

---

### 4. Skill Expansion Evaluator CLI

**File:** `evaluate-skill-expansion.cli.ts`

Evaluates skill expansion quality using LLM-as-a-Judge methodology.

```bash
# Show help
bun run cli evaluator:skill-expansion --help

# Load and evaluate test-set-skill-expansion.json
bun run cli evaluator:skill-expansion test-set-skill-expansion.json

# Evaluate with custom test set name
bun run cli evaluator:skill-expansion test-set-v1.json --test-set-name "my-experiment"

# Run 3 iterations with custom judge model
bun run cli evaluator:skill-expansion test-set-v1.json --iterations 3 --judge-model "gpt-4o"
```

---

### 5. Course Retrieval Evaluator CLI (JSON)

**File:** `evaluate-from-json.cli.ts`

Evaluates course retrieval performance using LLM-as-a-Judge methodology with JSON test sets.

```bash
# Show help
bun run cli evaluator:evaluate-json --help

# Load and evaluate test-set-v1.json
bun run cli evaluator:evaluate-json test-set-v1.json

# Resume evaluation after crash (skip completed)
bun run cli evaluator:evaluate-json test-set-v1.json --resume

# Evaluate specific skill with custom test set name
bun run cli evaluator:evaluate-json test-set-v1.json --query-log-id "abc123" --skill "python" --test-set-name "my-experiment"
```

---

### 6. Test Set Builder CLI

**File:** `test-set-builder.cli.ts`

Builds test sets from query logs by extracting raw data from enriched logs.

```bash
# Show help
bun run cli evaluator:test-set-builder --help

# List available steps
bun run cli evaluator:test-set-builder --list-steps

# List available query-log IDs
bun run cli evaluator:test-set-builder --list

# Build skill expansion test set
bun run cli evaluator:test-set-builder --step skill-expansion --ids log-id-1

# Build answer synthesis eval test set (merged, recommended)
bun run cli evaluator:test-set-builder --step answer-synthesis-eval --ids log-id-1,log-id-2 --output my-test-set.json
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
| `answer-synthesis-eval` | ANSWER_SYNTHESIS_EVAL | Merged test set for evaluation (answer + context) |

---

## Output Location

Test sets are exported to `data/evaluation/test-sets/` with timestamps:
- `test-set-<step>-<timestamp>.json`

Example: `data/evaluation/test-sets/test-set-skill-expansion-1736275200000.json`

Evaluation results are saved to:
- Answer Synthesis: `data/evaluation/answer-synthesis/<test-set-name>/`
- Course Filter: `data/evaluation/course-relevance-filter/<test-set-name>/`
- Skill Expansion: `data/evaluation/skill-expansion/<test-set-name>/`
- Course Retriever: `data/evaluation/course-retriever/<test-set-name>/`
