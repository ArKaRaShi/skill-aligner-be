# Skill Expansion Evaluator

## Overview

This module performs **sanity checks** on the `SkillExpanderService` to ensure that generated skills are valid "University-Level Competencies" suitable for course recommendation matching.

## Purpose

The `SkillExpanderService` extracts skills from user questions to enable course matching. This evaluator validates that:

1. **Skills are academically sound** - Concepts and competencies taught in universities
2. **Skills are teachable** - Can be assessed via exams, projects, or labs
3. **Skills are relevant** - Serve as logical bridges between user queries and course content
4. **Core concepts are preserved** - User's original intent is not lost in expansion

---

## Evaluation Criteria

The LLM-as-a-Judge evaluates each skill against **three primary criteria**:

### 1. Academic Scope ✅

**ACCEPT:**

- Abstract concepts: `"Critical Thinking"`, `"Data Analysis"`, `"Problem Solving"`
- Technical competencies: `"Python Programming"`, `"AutoCAD Design"`, `"Statistical Analysis with SPSS"`
- Domain knowledge: `"Machine Learning"`, `"Organic Chemistry"`, `"Business Strategy"`

**REJECT:**

- Trivial procedures: `"How to install Windows"`, `"Clicking the File menu"`
- Lucky outcomes: `"Becoming famous"`, `"Winning lottery"`
- Non-academic tasks: `"Watching YouTube"`, `"Surfing the web"`

### 2. Teachability 🎓

- Is this skill found in university course descriptions or learning outcomes?
- Can it be assessed through exams, projects, or lab work?

**Examples:**

- ✅ `"Object-Oriented Programming"` - Found in CS curricula, assessable via coding projects
- ❌ `"How to fix a printer"` - Not typically taught in university courses

### 3. Relevance Bridge 🔗

- Does the skill connect the user's question to potential course content?
- Does it enable meaningful course recommendations?

**Examples:**

- **Question:** "What is OOP?"
  - ✅ `"Object-Oriented Programming"` - Direct concept match
  - ✅ `"Software Design Principles"` - Related enabling concept
  - ❌ `"Cooking"` - Irrelevant

### 4. Concept Preservation (Overall) 🎯

**CRITICAL:** At least ONE skill must preserve the **core semantic meaning** of the user's question.

**Examples:**

- **Question:** "What is OOP?"
  - ✅ Skills: `"Object-Oriented Programming"`, `"Encapsulation"`, `"Inheritance"` → **CONCEPT PRESERVED**
  - ❌ Skills: `"Java Programming"`, `"Python Syntax"` → **CONCEPT LOST** (tool-specific, missing OOP concept)

- **Question:** "How to cook Thai food?"
  - ✅ Skills: `"Thai Cuisine Techniques"`, `"Southeast Asian Cooking"` → **CONCEPT PRESERVED**
  - ❌ Skills: `"Chemistry"`, `"Biology"` → **CONCEPT LOST** (too general, no connection to cooking)

---

## Metrics Tracked

| Metric                        | Formula                             | Purpose                               |
| ----------------------------- | ----------------------------------- | ------------------------------------- |
| **Relevance Rate**            | `relevantSkills / totalSkills`      | Are skills relevant to the question?  |
| **Teachability Rate**         | `teachableSkills / totalSkills`     | Are skills teachable in universities? |
| **Concept Preservation Rate** | `conceptPreserved / totalQuestions` | Is user's core concept preserved?     |
| **Overall Agreement Rate**    | `agreedSkills / totalSkills`        | System vs Judge alignment             |
| **Average Quality Score**     | `sum(qualityScores) / totalSkills`  | Per-skill quality (1-5 scale)         |
| **Average Reason Quality**    | `sum(reasonScores) / totalSkills`   | Quality of justification (1-5 scale)  |

---

## Judge Output Schema

```typescript
{
  "skills": [
    {
      "skill": "Object-Oriented Programming",
      "verdict": "PASS | FAIL",
      "note": "Valid technical competency"
    }
  ],
  "overall": {
    "conceptPreserved": true,
    "summary": "All skills are relevant and teachable, with OOP concept preserved"
  }
}
```

---

## How It Works

### 1. Test Set Builder

```bash
bun run cli test-set-builder --step skill-expansion --ids 1,2,3,4,5
```

Creates test set from query logs with:

- User questions
- System-generated skills
- LLM metadata

### 2. Run Evaluation

```bash
bun run cli evaluator:skill-expansion \
  --test-set test-set-skill-expansion-20250124.json \
  --judge-model gpt-4o-mini \
  --iterations 3
```

### 3. Output Structure

```
data/evaluation/skill-expansion/{testSetName}/
├── iteration-1/
│   ├── records/              # Raw evaluation records
│   ├── metrics/              # Per-iteration metrics
│   ├── cost/                 # Token usage and costs
│   └── progress-iteration-1.json  # Progress tracking
├── iteration-2/
├── iteration-3/
├── final-metrics/            # Aggregated metrics across iterations
└── final-cost/               # Total costs across iterations
```

---

## Progress Tracking & Crash Recovery

The evaluator tracks progress at **skill level** using unique hashes:

```typescript
hash = SHA256(`${queryLogId}|${question}|${skill}`);
```

**Benefits:**

- **Resume capability** - Crash during evaluation? Resume from where you stopped
- **Skip already-evaluated** - Reuse verdicts for skills seen in previous runs
- **Cost savings** - No duplicate LLM calls for the same question+skill combination

**How it works:**

1. On first run: All skills are evaluated and saved to progress file
2. On resume: Load progress, skip skills with existing hashes, evaluate only new skills
3. Progress file: `data/evaluation/skill-expansion/{testSetName}/progress-iteration-{N}.json`

---

## Architecture

```
skill-expansion/
├── evaluators/
│   └── skill-expansion-judge.evaluator.ts    # LLM judge calls
├── services/
│   ├── skill-expansion-comparison.service.ts # Compare system vs judge
│   ├── skill-expansion-metrics-calculator.service.ts  # Calculate metrics
│   ├── skill-expansion-runner.service.ts      # Main orchestrator
│   └── skill-expansion-result-manager.service.ts     # File I/O
├── loaders/
│   └── skill-expansion-test-set-loader.service.ts    # Load test sets
├── prompts/
│   └── skill-expansion-judge.prompt.ts        # Judge LLM prompts
├── utils/
│   └── skill-expansion-hash.util.ts           # Hash generation
├── schemas/
│   └── schema.ts                              # Zod validation schemas
└── types/
    └── skill-expansion.types.ts               # TypeScript types
```

---

## Comparison with Reference Implementation

This module follows the same architecture as `course-relevance-filter` evaluator:

| Feature           | Course Filter                 | Skill Expansion                               |
| ----------------- | ----------------------------- | --------------------------------------------- |
| **Granularity**   | Per-course                    | Per-skill                                     |
| **LLM Scope**     | Multiple courses per question | All skills per question                       |
| **Skip Strategy** | Skip individual courses       | Skip only if ALL skills done                  |
| **Progress File** | `progress-iteration-{N}.json` | `progress-iteration-{N}.json`                 |
| **Metrics**       | Relevance, PASS/FAIL          | Relevance, Teachability, Concept Preservation |

**Key Difference:**

- Course-filter evaluates **multiple courses** in one LLM call, can skip individual courses
- Skill-expansion evaluates **all skills** in one LLM call, only skips if entire sample is complete

---

## CLI Commands

### Build Test Set

```bash
bun run cli test-set-builder --step skill-expansion --ids 1,2,3
```

### Run Evaluation

```bash
# Basic
bun run cli evaluator:skill-expansion \
  --test-set test-set-skill-expansion-20250124.json

# Custom model
bun run cli evaluator:skill-expansion \
  --test-set test-set-skill-expansion-20250124.json \
  --judge-model gpt-4o \
  --iterations 5

# Reset progress
bun run cli evaluator:skill-expansion \
  --test-set test-set-skill-expansion-20250124.json \
  --reset
```

---

## Test Coverage

| Suite              | Tests    | Coverage                                |
| ------------------ | -------- | --------------------------------------- |
| Judge Evaluator    | 6 tests  | LLM prompt structure, schema validation |
| Comparison Service | 17 tests | Agreement logic, action mapping         |
| Metrics Calculator | 8 tests  | All metric calculations                 |
| Test Set Loader    | 28 tests | File I/O, transformation, validation    |
| Runner Service     | 9 tests  | Orchestration, progress tracking        |
| Result Manager     | 15 tests | File I/O, aggregation, statistics       |

**Total:** 83 unit tests + 10 integration tests = **93 tests**

---

## References

- **Standard:** `/docs/architecture/evaluation-module-standard.md`
- **Reference Implementation:** `/src/modules/evaluator/course-relevance-filter/`
- **Target Service:** `/src/modules/query-processor/services/skill-expander/skill-expander.service.ts`
- **Judge Prompt:** `prompts/skill-expansion-judge.prompt.ts`
