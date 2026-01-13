# Rationale: Why Exactly Four Criteria?

## The Core Question

**"Why exactly four criteria? Is this arbitrary or principled?"**

This document defends the choice of four evaluation criteria for skill inference plausibility. The short answer:

> **"The four criteria are the minimal set needed to judge whether an inferred skill is reasonable for a user's question — not correct, not optimal, just reasonable."**

---

## The Logic Behind the Number

We do **not** claim four criteria because it's "comprehensive." That would be hand-wavy.

Instead, each criterion exists to prevent a **specific type of error** that appeared during early experiments and reasoning.

---

## The Four Failure Modes

Each criterion guards against a distinct and common error mode. Removing any one leads to observable false positives. Adding more would introduce artificial precision without ground truth.

### 1. Relevance to User Intent

**Why it exists:**

To prevent skills that are technically related but irrelevant to what the user is trying to achieve.

**Failure without it:**

```
User asks: "I want to learn basic coding"
System infers: "Project management"
```

Technically useful? Yes. Wrong intent? Also yes.

**This criterion answers:**

> "Does this skill help with what the user wants?"

---

### 2. Learnability

**Why it exists:**

Because not everything that sounds like a "skill" is actually teachable.

**Failure without it:**

- "Critical thinking"
- "Professional mindset"
- "Problem-solving attitude"

These are real concepts, but not actionable learning units.

**This criterion answers:**

> "Can this reasonably be taught or learned?"

---

### 3. Appropriate Abstraction Level

**Why it exists:**

To avoid skills that are either too vague or too microscopic.

**Failure without it:**

```
Too broad:
- "Technology"
- "Business"

Too narrow:
- "Using TensorFlow Adam optimizer with lr=0.001"
```

**This criterion answers:**

> "Is this at the right granularity for course-level learning?"

---

### 4. Domain Consistency

**Why it exists:**

Because skills can transfer across domains, but not all transfers are appropriate.

**Failure without it:**

```
User asks about: "Software architecture"
Skill exists in: "Logistics systems"
```

The skill exists, but in the wrong domain context.

**This criterion answers:**

> "Is this skill applied in the same domain the user implies?"

---

## Why Exactly Four? (The Real Justification)

Each criterion guards against a **distinct and common error**:

- Removing any one → observable false positives
- Adding more → artificial precision without ground truth

This is a strong academic stance because it acknowledges the limits of what can be measured without pretending to have perfect knowledge.

---

## Common Pushback Responses

### "Why not 3? Why not 6?"

**Response:**

> "This is not a decomposed metric. The criteria are not independent dimensions — they are filters for plausibility. Four is sufficient to reject unreasonable skills without overfitting the judgment."

**Translation:** We stopped before it became fake math.

---

### "Isn't this subjective?"

**Response:**

> "Yes — plausibility is inherently subjective. The goal is consistency, not objectivity. The same rubric is applied uniformly across all evaluations."

This aligns with LLM-as-judge research: we prioritize consistent application over false claims of objectivity.

---

## The Meta-Defense (Use Only If Needed)

> "There is no ground truth for 'correct skills' given an open-ended question. This rubric operationalizes human intuition in a controlled way."

Reviewers and committee members often appreciate this honesty — it puts you on the side of integrity rather than pretending ground truth exists when it doesn't.

---

## Summary

The four criteria represent:

1. **User Intent** — prevents technically related but irrelevant skills
2. **Learnability** — ensures skills are teachable units
3. **Abstraction Level** — maintains appropriate granularity
4. **Domain Consistency** — preserves contextual alignment

This is appropriately scoped, not weak. Half the industry ships models with "trust me bro" as their evaluation method — having **any** explicit rubric puts you ahead of the curve.

---

## One-Sentence Summary

> **"Four criteria are sufficient to reject unreasonable skills without introducing artificial precision where no ground truth exists."**
