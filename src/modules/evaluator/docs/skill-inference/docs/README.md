# Skill Inference Plausibility Evaluation

## Purpose

The **plausibility evaluation** is a _sanity check_ for inferred skills.  
It verifies whether the skills inferred from a user’s question are **reasonable learning expectations**, not whether they are objectively correct, complete, or optimal.

This evaluation is **qualitative and approximate by design**.

---

## Definition of Plausibility

> **Plausibility** refers to whether an inferred skill reasonably represents something a learner would expect to learn in order to address the user’s question.

Plausibility does **not** measure:

- correctness
- completeness
- optimal curriculum design
- expert-level coverage

It only answers:

> “Does this skill make sense in this context?”

---

## Evaluation Labels

This evaluation uses **binary labels**:

- **Plausible**
- **Not Plausible**

A coarse-grained decision is intentional to avoid false precision.

---

## Plausibility Criteria

An inferred skill is considered **Plausible** if **all** of the following conditions are met:

### 1. Relevance to User Intent

The skill logically contributes to addressing the user’s explicit or implicit goal.

### 2. Learnability

The skill represents something that can reasonably be taught or learned  
(not a vague outcome, personality trait, or life skill).

### 3. Appropriate Abstraction Level

The skill is neither:

- too broad (e.g., “Technology”, “Business”)
- nor too specific (e.g., “Using TensorFlow v2.13 Adam optimizer”)

### 4. Domain Consistency

The skill belongs to the same general domain implied by the user’s question.

> If **any** criterion fails → the skill is labeled **Not Plausible**.

---

## Examples

### Example 1

**User Question:**

> อยากทำงานเป็น Data Analyst ต้องเรียนอะไรบ้าง?

| Inferred Skill             | Plausibility  | Reason                                                      |
| -------------------------- | ------------- | ----------------------------------------------------------- |
| Data analysis fundamentals | Plausible     | Core learning expectation                                   |
| SQL querying               | Plausible     | Commonly required skill                                     |
| Data visualization         | Plausible     | Directly supports the goal                                  |
| Public speaking            | Not Plausible | Useful in general, but not an expected learning requirement |

---

### Example 2

**User Question:**

> อยากทำแอปมือถือ

| Inferred Skill                    | Plausibility  | Reason                               |
| --------------------------------- | ------------- | ------------------------------------ |
| Mobile application development    | Plausible     | Direct skill                         |
| UI/UX design                      | Plausible     | Strongly related                     |
| Project management                | Not Plausible | Too indirect without explicit intent |
| Cloud infrastructure optimization | Not Plausible | Too advanced and misaligned          |

---

### Example 3

**User Question:**

> อยากเรียนเขียนโปรแกรมเบื้องต้น

| Inferred Skill                   | Plausibility  | Reason                  |
| -------------------------------- | ------------- | ----------------------- |
| Basic programming concepts       | Plausible     | Direct expectation      |
| Control flow (loops, conditions) | Plausible     | Foundational            |
| Software architecture design     | Not Plausible | Wrong abstraction level |

---

### Edge Case Example

**User Question:**

> อยากทำ Startup ด้านเทคโนโลยี

| Inferred Skill           | Plausibility  | Reason                                       |
| ------------------------ | ------------- | -------------------------------------------- |
| Business model design    | Plausible     | Reasonable learning expectation              |
| Programming fundamentals | Plausible     | Commonly implied                             |
| Corporate law compliance | Not Plausible | Important but not an expected learning focus |

---

## Evaluation Method

- Plausibility can be assessed:
  - manually (human review)
  - or using an LLM as a judge with the same rubric
- The same criteria are applied consistently across all evaluations.
- No expert ground truth is assumed.

---

## Interpretation

- A high plausibility rate indicates that the skill inference component produces **reasonable and interpretable skills**.
- This evaluation does **not** claim optimality or completeness.
- Disagreement between evaluators is expected and acceptable.

---

## Rationale

This evaluation exists to:

- prevent obviously irrelevant or misleading skills
- ensure downstream retrieval is not polluted
- support exploratory learning rather than precise recommendation

The goal is **usability and interpretability**, not academic perfection.

---

## One-Sentence Defense (for Q&A)

> “Plausibility checks whether an inferred skill is a reasonable learning expectation given the user’s question, not whether it is objectively correct or exhaustive.”

---

## Design Note

This project intentionally favors:

- approximate reasoning
- consistent qualitative judgment
- user-oriented exploration

over:

- fine-grained expert labeling
- rigid taxonomies
- false precision

---

### Reminder to Future Me

> If someone asks for more precision:  
> **There is no ground truth for skill inference. This rubric is a controlled approximation.**
