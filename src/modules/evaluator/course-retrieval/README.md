Purpose:
This evaluator measures the quality of the COURSE RETRIEVER only,
independent of downstream scoring, ranking, or UI logic.

Rationale:

- The retriever operates primarily on skill-based matching.
- As a result, it may retrieve courses that are highly relevant to the skill
  but misaligned with the user's contextual intent or domain.
- Such behavior is EXPECTED and acceptable at this stage.

Design Intent:

- Skill relevance and context alignment are evaluated as independent dimensions
  to expose different failure modes of retrieval.
- High skill relevance with low context alignment justifies the need for
  post-retrieval scoring and UI grouping in later stages of the pipeline.

Evaluation Philosophy:

- This evaluator is used for relative comparison and qualitative analysis,
  not as absolute ground truth.
- LLM-as-judge is applied consistently across all experiments to ensure
  comparability rather than exact correctness.

In short:
This evaluator answers: "Did the retriever pull courses related to the skill,
and what kinds of contextual mismatches naturally appear?"

📝 Comment — Criterion 1: Skill Relevance (Skill-only, Context Ignored)

Purpose: Measure how much the course actually teaches the skill, regardless of why the user wants it.

Score 3 — Strong Relevance

Definition:
The course is primarily designed to teach this skill. Most learning outcomes directly target it.

Example:
• Skill: Basic Programming
• Course: Introduction to Programming
• Reason: Core lectures, assignments, and assessments focus on programming fundamentals.

⸻

Score 2 — Moderate Relevance

Definition:
The skill is an important component or tool, but not the sole focus of the course.

Example:
• Skill: Programming
• Course: Data Structures and Algorithms
• Reason: Programming is essential, but the course emphasizes algorithmic thinking rather than basic coding.

⸻

Score 1 — Weak Relevance

Definition:
The skill appears only as a supporting topic, prerequisite, or minor part.

Example:
• Skill: Programming
• Course: Software Engineering
• Reason: Programming is assumed knowledge; the course focuses on process, teamwork, and design.

⸻

Score 0 — Irrelevant

Definition:
The skill is not covered at all in the course content or learning outcomes.

Example:
• Skill: Programming
• Course: Digital Marketing
• Reason: No programming concepts are taught or required.

⸻

📝 Comment — Criterion 2: Context Match (Intent & Domain Only)

Purpose: Measure how well the course fits what the user wants to do, regardless of how well it teaches the skill.

⸻

Score 3 — Strong Alignment

Definition:
The course domain, depth, and application context directly match the user’s intent.

Example:
• User intent: “อยากเริ่มเขียนโปรแกรมพื้นฐาน”
• Course: Introduction to Programming
• Reason: Matches beginner level, general purpose, and learning goal.

⸻

Score 2 — Partial / Exploratory Alignment

Definition:
The course is in a related domain and useful for background or exploration, but not the most targeted option.

Example:
• User intent: “อยากเริ่มเขียนโปรแกรมพื้นฐาน”
• Course: Software Design and Architecture
• Reason: Same domain (software), but focuses on design concepts rather than hands-on beginner coding.

👉 Useful as contextual knowledge, not a direct answer.

⸻

Score 1 — Context Mismatch

Definition:
The course uses similar skills but applies them in a different domain or purpose than the user intends.

Example:
• User intent: General coding skills
• Course: Programming for Business Analytics
• Reason: Programming is applied specifically to business/data problems, not general software development.

👉 Skill overlap ≠ intent alignment.

⸻

Score 0 — Irrelevant

Definition:
The course domain and application context are clearly unrelated to the user’s goal.

Example:
• User intent: Learning programming
• Course: Introduction to Psychology
• Reason: No domain or intent overlap.

⸻

One-liner you can say if grilled in Q&A 🎯

“Skill Relevance measures what the course teaches, while Context Match measures why and for whom it is useful.”

That sentence alone can save you 10 minutes of rambling.

## 📊 Summary of Retrieval Evaluation Metrics

These metrics evaluate retriever behavior, not absolute correctness.
They are used for relative comparison, diagnosis, and explanation.

⸻

🔹 averageSkillRelevance

What it measures
How well the retriever finds courses that actually cover the requested skill.

Interpretation
• High → Retriever is good at subject/topic matching
• Low → Retriever fails to surface courses teaching the skill

Why it exists
• Evaluates subject coverage independent of user intent

⸻

🔹 skillRelevanceDistribution

What it measures
The distribution of skill relevance scores (0–3) across retrieved courses.

Interpretation
• Many 3s → Strong topical retrieval
• Many 0s/1s → Noisy or weak retrieval

Why it exists
• Shows whether retrieval quality is consistently good or scattered

⸻

🔹 averageContextAlignment

What it measures
How well retrieved courses align with the user’s intent, domain, and application context.

Interpretation
• High → Retriever understands what the user is trying to achieve
• Low → Retriever finds relevant skills in the wrong domain

Why it exists
• Evaluates user understanding, not just keyword matching

⸻

🔹 contextAlignmentDistribution

What it measures
The spread of context alignment scores (0–3).

Interpretation
• Many 3s → Context-aware retrieval
• Many 1s → Skill matches but domain mismatch

Why it exists
• Helps explain why results feel irrelevant to users

⸻

🔹 alignmentGap
alignmentGap = averageSkillRelevance - averageContextAlignment
What it measures
The gap between subject relevance and context understanding.

Interpretation
• ≈ 0 → Balanced retrieval
• 0 → Skill-first retrieval (expected)
• < 0 → Context looks right, skill coverage is weak

Why it exists
• Diagnoses whether post-retrieval scoring and UI grouping are needed

⸻

🔹 contextMismatchRate

What it measures
Percentage of courses with high skill relevance but low context alignment.

Interpretation
• High → Retriever finds correct skills in wrong domains
• Low → Retriever already context-aware

Why it exists
• Justifies:
• post-retrieval scoring
• relevance grouping
• contrast-based UI (e.g., Sankey)

⸻

🔹 contextMismatchCourses

What it contains
List of courses that:
• Teach the skill well
• But do not match the user’s intent/domain

Why it exists
• For qualitative inspection
• For visualization and explanation in demos

⸻

🧠 Design Philosophy (Reminder for Future You)
• Scores are approximate relevance levels, not decomposed metrics
• LLM is used as a consistent judge, not a ground-truth oracle
• Metrics explain system behavior, not human learning outcomes
