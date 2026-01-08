# Skill Inference Module

This module provides evaluation and quality assurance for inferred skills in the query processing pipeline.

---

## Documentation

| Document                                           | Description                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **[README.md](./README.md)**                       | Core plausibility evaluation framework with criteria definitions, examples, and evaluation methodology        |
| **[WHY-FOUR-CRITERIA.md](./WHY-FOUR-CRITERIA.md)** | Detailed rationale and defense of the four-criteria design, including failure mode analysis and Q&A responses |

---

## Quick Overview

### What is Skill Inference Plausibility?

The **plausibility evaluation** is a sanity check for inferred skills. It verifies whether skills extracted from user questions represent **reasonable learning expectations** — not whether they are objectively correct, complete, or optimal.

### The Four Criteria

An inferred skill is **Plausible** only if **all** four conditions are met:

1. **Relevance to User Intent** — Contributes to addressing the user's goal
2. **Learnability** — Can reasonably be taught or learned
3. **Appropriate Abstraction Level** — Neither too broad nor too specific
4. **Domain Consistency** — Belongs to the domain implied by the question

> **Failure of any criterion → Not Plausible**

---

### For Q&A / Defense

- **One-sentence summary:**

  > "Plausibility checks whether an inferred skill is a reasonable learning expectation given the user's question, not whether it is objectively correct or exhaustive."

- **When questioned about the number of criteria:**
  See [WHY-FOUR-CRITERIA.md](./WHY-FOUR-CRITERIA.md) for detailed responses to common objections.

---

## Design Philosophy

This project intentionally favors:

- **Approximate reasoning** over fine-grained expert labeling
- **Consistent qualitative judgment** over rigid taxonomies
- **User-oriented exploration** over false precision

> **There is no ground truth for skill inference. This rubric is a controlled approximation.**

---

## Related Modules

- **[`query-processor`](../../../query-processor/)** — Main pipeline that uses skill inference
- **[`course-retriever`](../../retriever/)** — Course evaluation and retrieval
- **[`query-logging`](../../../query-logging/)** — Tracks query processing metrics
