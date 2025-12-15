# Question Set V8 Documentation

## Overview

Question Set V8 is a 90-question benchmark for evaluating the `classify-question-v9` prompt. It keeps the same domain focus as V7 (technology + finance vs. language learning, fitness, cooking) while sharpening coverage of the three allowed question patterns (A-C) and the stricter concept rules from the new system prompt. Every item pairs a clear concept with the expected label (relevant, irrelevant, dangerous) and language reasoning so that regression failures can be traced directly to the updated instructions.

## Distribution Ratio And Rules

Total 90 questions are divided as follows:

### Language Distribution

**Thai Questions**

- Count: 63 (70%)
- Used for colloquial, slang, and short-form intents.

**English Questions**

- Count: 27 (30%)
- Used for formal, multi-clause, and transition intents.

### Question Type Distribution

**Relevant Questions**

- Count: 60 (66.7%)
- Alignment with patterns: Pattern A = 26, Pattern B = 20, Pattern C = 14.
- Domain split (same as V7):
  - Technical/Professional: 30 questions (Technology 15, Finance 15)
  - Non-Technical/General Life: 30 questions (Language Learning 10, Fitness & Wellness 10, Cooking 10)
- Paraphrase plan (mirrors V7 clarity):
  - Technology (AI, programming, cybersecurity): 5 intent templates × 3 paraphrases each (2 Thai, 1 English) = 15 questions.
  - Finance: 5 intent templates × 3 paraphrases each (2 Thai, 1 English) = 15 questions.
  - Language Learning: 3 intent templates × 3 paraphrases each (2 Thai, 1 English) = 9 questions + 1 extra Thai variant focused on idiomatic phrasing = 10 questions.
  - Fitness & Wellness: 3 intent templates × 3 paraphrases each (2 Thai, 1 English) = 9 questions + 1 extra Thai slang-heavy variant = 10 questions.
  - Cooking: 3 intent templates × 3 paraphrases each (2 Thai, 1 English) = 9 questions + 1 extra Thai regional-cuisine variant = 10 questions.
  - Each template is assigned to one of the three question patterns so the overall count across all domains still matches Pattern A = 26, Pattern B = 20, Pattern C = 14.
- Concept rules: Every question explicitly mentions a topic, skill, task, or role that is mappable to teachable skills, matching the prompt’s concept definition.

**Irrelevant Questions**

- Count: 20 (22.2%)
- Coverage of limitation cases:
  - J. Specific course IDs/codes: 4 questions
  - K. Institution/faculty logistics: 3 questions
  - L. Registration/admin schedules: 3 questions
  - M. Skill-free self-help: 3 questions
  - N. Non-learning intent (weather, gossip, chit-chat): 3 questions
  - O. Fantasy/imaginary contexts: 2 questions
  - P. Free-form nonsense or ambiguous references: 2 questions
- Paraphrase plan:
  - Types J-O each use 2 Thai paraphrases + 1 English paraphrase (except when total allocation is 2, in which case both are Thai) to surface repeated limitation violations in different wording.
  - Type P keeps 2 Thai nonsense prompts (no English variant) to cover ambiguous references while respecting the smaller allocation.
- Language split: 13 Thai, 7 English.
- Purpose: force the classifier to reject inputs where skills cannot be extracted or system limitations are violated.

**Dangerous Questions**

- Count: 10 (11.1%)
- Construction rules:
  - 3 intent templates derived from Pattern A-style prompts and 2 from Pattern C-style prompts; each template produces 1 Thai + 1 English paraphrase (total 10 questions) where the concept is swapped for illegal or harmful activities (weapon building, terrorism, document forgery, drug production, explicit hacking).
- These ensure the classifier prioritizes safety over the A-C pattern match.

This distribution mirrors real student usage (mostly relevant learning questions) while providing enough edge cases to stress-test the new prompt’s stricter logic.

## Domain Coverage

Domains are identical to V7 so downstream evaluation remains comparable:

### Technical / Professional Domain

1. **Technology** – programming, AI/ML, cybersecurity, cloud, data engineering.
2. **Finance** – corporate finance, personal investing, banking analytics, fintech operations.

### Non-Technical / General Life Domain

1. **Language Learning** – English, Chinese, Japanese, TOEIC/IELTS prep, translation tasks.
2. **Fitness & Wellness** – strength training, yoga, rehab exercises, nutrition coaching.
3. **Cooking** – Thai cuisine, baking, meal prep, food styling.

Each domain contributes equally to the relevant set to prevent skew toward technology-heavy content. Pattern C items often mix two subdomains (e.g., “from accounting to data analytics”, “from Thai cuisine to healthy meal prep”) to validate the classifier’s multi-concept reasoning.

## Question Patterns And Concept Mapping

The prompt limits valid questions to three patterns. The set enforces balanced coverage and highlights tricky interpretations:

- **Pattern A – Direct/Explicit Concept Request (26 questions)**  
  - Clearly named topics (e.g., “AI ethics”), skills (“Python scripting”), tasks (“meal-prep for athletes”), or roles (“cloud operations engineer”).  
  - Includes intent phrases such as “อยากเรียน…”, “ต้องมีทักษะอะไร”, “What skills do I need…”.

- **Pattern B – Outcome/Goal-Oriented (20 questions)**  
  - Express a desired end state (“read financial statements confidently”, “prep for JLPT N2”).  
  - Often reference prior experience or expected improvements to ensure the concept is inferable even when not named directly.

- **Pattern C – Multi-Concept/Transition (14 questions)**  
  - Combine two domains (“from trading to risk management”, “add pastry skills to savory cooking”).  
  - Includes transition statements (“มีพื้นฐาน…แต่อยาก…”, “currently a … and want to move into …”).

Every relevant question ties back to a concept type (topic, skill, task, role). Questions lacking such a mapping are strictly placed in the irrelevant bucket per prompt limitation #1.

## Irrelevant And Dangerous Category Design

- **Irrelevant checks** ensure the model rejects:
  - University-specific logistics, faculty requests, or course code lookups (Limitation #2).
  - Vague self-help queries without concepts or any feasible skill extraction.
  - Fictional or nonsensical contexts even if a verb like “learn” appears.
  - Weather/social small-talk to test detection of non-learning intent.
- **Dangerous checks** inject illegal/NSFW requests phrased like valid pattern A-C prompts so that the classifier must prioritize safety definitions over pattern matching.

## Paraphrase, Language, And Intent Variation

1. **Multi-lingual phrasebook** – Each intent template is paraphrased across Thai/English, including formal register (“ท่านช่วย…”) and casual chat (“มีวิชาไหนแนะนำบ้าง”) to ensure robustness.  
2. **Sentence complexity** – Mix short prompts (“อยากเรียน Data Science”) with multi-clause narratives (“Given my background in retail banking, I want to pivot into fintech data science—what foundational skills should I build?”).  
3. **Concept granularity** – Rotate between explicit skills (“data visualization”), topics (“cloud security”), tasks (“meal prepping for diabetics”), and roles (“wellness coach”) to reinforce the concept definition section of the prompt.  
4. **Edge cases** – Ambiguous pronouns (“เรื่องนั้น”), previous-conversation callbacks, and conceptual blends (“เรียนภาษาจีนเพื่อสอนโยคะต่างประเทศ”) test whether the classifier still demands a concrete concept.  
5. **Transition nuances** – Pattern C includes both additive cases (adding cooking specializations) and complete pivots (finance → AI) so that the explanation must mention both concepts.

## Evaluation Goals

This documentation guides dataset authors and reviewers to:

1. Validate that every relevant example explicitly matches pattern A, B, or C and names a mappable concept.  
2. Confirm irrelevant items truly violate prompt limitations (no hidden skills).  
3. Ensure dangerous questions remain disallowed even when phrased like legitimate learning requests.  
4. Maintain bilingual balance with realistic university-student tone.  
5. Provide regression comparability with V7 while testing the stricter reasoning introduced in prompt V9.
