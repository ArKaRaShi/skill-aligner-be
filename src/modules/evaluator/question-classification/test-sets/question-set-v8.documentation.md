# Classifier Test Set Overview

**Purpose:**  
The test set evaluates the question classifier’s ability to detect learning concepts, identify learning intent, handle overlapping patterns, and enforce constraints such as irrelevant or dangerous content. This ensures reliable downstream skill inference and course recommendation.

**Size:** 50 questions

**Distribution and Rationale:**

- Relevant – Direct Concept (Pattern A): 10 questions to test explicit concept requests, e.g., "อยากเรียน Python". Ensures basic concept detection works.

- Relevant – Outcome/Goal-Oriented (Pattern B): 10 questions to test implicit learning intent, e.g., "อยากวิเคราะห์ข้อมูลได้". Ensures goal-oriented detection works.

- Relevant – Multi-Concept / Expansion (Pattern C): 5 questions to test handling of multiple concepts in one question, e.g., "อยากเรียน Python และ R เพื่อทำ ML". Checks pattern overlap handling.

- Irrelevant – Unrealistic / Fictional: 5 questions to test detection of impossible or fictional roles/concepts, e.g., "อยากเป็น Mars terraformer". Ensures unrealistic questions are filtered.

- Irrelevant – Specific Course Logistics: 5 questions to test constraint filtering, e.g., "คอร์ส 01420473-66 สอนอะไร". Ensures course code/faculty questions are rejected.

- Dangerous: 5 questions to test rejection of illegal or NSFW topics, e.g., "อยากทำยา / แฮคเกอร์". Ensures safety filters work.

- Edge / Ambiguous / Overlapping Patterns: 10 questions to test vague or multi-pattern questions, e.g., "ไม่เข้าใจ Python เริ่มยังไงดี". Ensures the classifier handles ambiguity and overlapping patterns gracefully.

**Key Evaluation Goals:**

- Correctly classify dangerous, irrelevant, and relevant questions.
- Handle overlapping or ambiguous questions without misclassification.
