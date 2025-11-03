## decision-answer-prompt-v2

### Prompt Anchors
- **User intent first:** Step 1 forces the model to read the question and identify target skills before touching the context.
- **Skill/course evidence:** Steps 2–3 direct it to review each skill/course pair in the context, using learning objectives and support notes to decide relevancy.
- **Schema-aligned output:** Step 4 plus the Additional Guidelines keep the response tied to `AnswerGenerationSchema`, ensuring `includes`, `excludes`, and `answerText` stay synchronized.
- **Language choice gate:** The language guidelines anchor the model to Thai or English by counting major verbs found in the user question.

### Key Rules Communicated
- Only use skills and courses explicitly present in the context; reuse their exact labels.
- Reasons must paraphrase the provided learning objectives and highlight the concrete benefit.
- `answerText` now must explicitly mention every course present in `includes` (by name with the same rationale), wrap all referenced skills/courses in double asterisks, and still avoid introducing new evidence. It never names courses that were excluded—those are only described at the skill/domain level.
- Every skill must be mentioned in `answerText`, even when all of its courses are excluded, with guidance on next steps.
- The prompt explicitly tells the model to honor user “avoid” clauses, excluding only the courses whose names/objectives mention the banned domain while keeping other courses for that skill.
- Courses are included when their objectives advance the user’s goal and excluded only when objectives/name explicitly point to unrelated or banned domains.
- Every course in the context must be assigned to either `includes` or `excludes`, with an explicit reason, so none are dropped silently. When a course is excluded, the model now has to add it to `excludes`—no implicit omissions.

### Remaining Vague Areas
- “Major verb” counting is subjective; the model may still guess if it cannot confidently split Thai vs. English verbs.
- The prompt assumes course names are sufficient identifiers—future validation may need explicit course IDs.
- Guidance now covers multi-objective courses: include them when at least one objective clearly supports the question, otherwise exclude. Ambiguous or off-topic objectives may still need manual review if phrasing is unclear.

### Pending Decisions & Follow-ups
- **Course prioritization (critical):** Prompt now instructs the model to treat all relevant courses equally; revisit once a reranker or scoring metadata is available.
- **Mixed-language fallback (critical):** Prompt now defaults to Thai when verb detection is inconclusive; reassess if user language mix shifts.
- **Zero-course skills (moderate):** Retain current behavior (note that the skill has no courses in this context). Revisit once richer skill descriptions exist.
- **Empty course arrays (moderate):** Decide whether to allow skills in `excludes` with `courses: []`. Current sanitizer strips them; revisit schema/prompt if keeping the skill node is important.
- **Tone/format expectations (moderate):** Not enforced yet; await stakeholder guidance before adding constraints.
- **Reason specificity (optional):** Continue nudging the model to reference concrete LO phrasing, but monitor for generic language.
