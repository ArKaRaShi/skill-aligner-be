// ============================================================================
// ANSWER SYNTHESIS JUDGE PROMPT
// ============================================================================
/**
 * LLM-as-a-Judge prompt for answer synthesis faithfulness evaluation.
 *
 * The judge evaluates faithfulness on a 1-5 scale:
 * 1 - Completely False (hallucinations)
 * 2 - Mostly False (major errors)
 * 3 - Mixed (some supported, some not)
 * 4 - Mostly True (minor misses)
 * 5 - Perfect (fully supported)
 */
import type { AggregatedCourseSkills } from 'src/modules/query-processor/types/course-aggregation.type';

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

/**
 * System prompt defines the judge's role and evaluation criteria.
 */
export const ANSWER_SYNTHESIS_JUDGE_SYSTEM_PROMPT = `
You are an expert evaluator for a RAG-based exploratory course mapping system.
Your task is to evaluate the generated answer on TWO DISTINCT DIMENSIONS:
1. FAITHFULNESS (Safety Check): Does it stick to the context?
2. COMPLETENESS (Explanatory Adequacy Check): Does it explain the reasoning well?

---

AXIS 1: FAITHFULNESS RUBRIC (1-5 Scale)
FOCUS: ACCURACY & HALLUCINATION

5: PERFECT - Fully supported by context. NO OUTSIDE INFO used.
4: MOSTLY TRUE - Factually accurate, misses minor context nuances.
3: MIXED - Mix of supported facts and hallucinations.
2: MOSTLY FALSE - Major factual errors or unsupported claims.
1: COMPLETELY FALSE - Contradicts context or PURE HALLUCINATION.

You MUST ALSO verify INTERNAL CONSISTENCY:

- If the answer claims that a course supports a specific skill or concept,
  that skill must be traceable to the PROVIDED CONTEXT.
- The claimed skill or rationale must be supported by:
  (a) the mapped skills shown in the context, or
  (b) the stated learning outcomes of that course.

If the answer attributes a course to a skill or rationale that is NOT supported by the mapped skills or learning outcomes in the provided context, treat this as an unsupported claim (hallucination).

AXIS 2: COMPLETENESS & BRIDGING RUBRIC (1-5 Scale)
FOCUS: EXPLANATION & LOGICAL CONNECTION TO USER QUERY

5: EXCELLENT BRIDGING
- EXPLICITLY EXPLAINS WHY the recommended course fits the user's specific query.
- CONNECTS THE DOTS (e.g., "Course X teaches Python, which is essential for your goal of building AI").
- If the match is indirect (e.g., Exploratory), it provides CLEAR REASONING.

4: GOOD EXPLANATION
- Links courses to the query logically but explanation might be slightly generic.
- Covers the recommended courses well.

3: DESCRIPTIVE ONLY
- Simply LISTS what the courses teach (summarizes context) but FAILS TO EXPLAIN WHY it matters to the user.
- User has to guess the connection.

2: WEAK
- Lists courses with VERY LITTLE context or explanation.

1: FAIL
- Just lists course codes/names WITHOUT REASONING.
- Or states "No relevant courses found" when VALID OPTIONS EXISTED in the context.

---

STRUCTURAL & LOGICAL REQUIREMENTS:

1. FLOW VERIFICATION:
   - The answer should generally follow this pattern: Exploratory Framing (Broad Concept) -> Concrete Evidence (Courses/Aspects) -> Summarization.
   - If the answer jumps straight to course lists without framing the user's broad intent first, penalize Completeness.

2. ASPECT-EVIDENCE LINKING (CRITICAL):
   - When the system groups courses under a specific "Aspect" or "Skill" (e.g., "For Video Editing... [Course A]"), you must VERIFY in "SECTION 1: MATCHED EVIDENCE" of that specific course.
   - Does Section 1 actually list "Video Editing" (or a semantic equivalent) for Course A?
   - IF NO: This is a "Misattribution Hallucination" (Faithfulness Score = 2 or 3). The course exists, but it does NOT support the aspect claimed by the system.

3. FORMAT CHECK:
   - Verify that courses are cited in the format: "Course Name (Course Code)".

---

EVALUATION STEPS:

1. ANALYZE FAITHFULNESS (AXIS 1):
   - SCAN the answer for claims.
   - VERIFY each claim against the PROVIDED CONTEXT ONLY.
   - Verify if the "Aspect Frame" (the category/skill used to group the course) is supported by the context. Specifically, ensure that the course listed under that frame implies a skill that actually MAPS to "SECTION 1: MATCHED EVIDENCE".
   - (Draft the Faithfulness Score).

2. ANALYZE COMPLETENESS (AXIS 2):
   - Look at the User Query.
   - CHECK if the answer provides a "Rationale" or "Bridge" linking the Course to the Query.
   - (Draft the Completeness Score).

3. FORMAT OUTPUT:
   - Combine both evaluations into the JSON format below.

---

OUTPUT FORMAT:

Return a SINGLE VALID JSON object:

\`\`\`json
{
  "faithfulness": {
    "score": <1-5>,
    "reasoning": "Brief check for hallucinations..."
  },
  "completeness": {
    "score": <1-5>,
    "reasoning": "Brief check for explanatory logic..."
  }
}
\`\`\`

REQUIREMENTS:
- INDEPENDENCE: Evaluate the two axes INDEPENDENTLY. An answer can be Highly Complete (very persuasive) but Low Faithfulness (hallucinated). Conversely, it can be High Faithfulness (accurate) but Low Completeness (useless listing).
- STRICT CONTEXT: For Faithfulness, use ONLY THE PROVIDED CONTEXT. DO NOT USE OUTSIDE KNOWLEDGE.
`;

// ============================================================================
// CONTEXT FORMATTING
// ============================================================================

/**
 * Format course context for judge evaluation.
 *
 * NOTE: Excludes relevance scores for BLIND EVALUATION.
 * The judge should evaluate based on content quality, not system scores.
 *
 * @param context - Ranked courses with matched skills
 * @returns Formatted context string
 */
export function formatContextForJudge(
  context: AggregatedCourseSkills[],
): string {
  if (context.length === 0) {
    return '(No courses available)';
  }

  const courseBlocks = context.map((courseSkills) => {
    // Build matched evidence section
    const matchedEvidence = courseSkills.matchedSkills
      .map(
        (ms) => `[Mapped Skill: ${ms.skill}]
${ms.learningOutcomes.map((lo) => `- ${lo.cleanedName}`).join('\n')}`,
      )
      .join('\n\n');

    // Build full context section
    const fullContext = courseSkills.courseLearningOutcomes
      .map((lo) => `- ${lo.cleanedName}`)
      .join('\n');

    return `COURSE: ${courseSkills.subjectName} (${courseSkills.subjectCode})

SECTION 1: MATCHED EVIDENCE (Skills & Learning Outcomes)
${matchedEvidence}

SECTION 2: FULL CONTEXT (All learning outcomes)
${fullContext}`;
  });

  return courseBlocks.join('\n\n---\n\n');
}

// ============================================================================
// USER PROMPT TEMPLATE
// ============================================================================

/**
 * Build the user prompt with question, context, and answer.
 *
 * @param question - User's original question
 * @param context - Ranked courses with matched skills
 * @param answer - System's generated answer
 * @returns Formatted user prompt
 */
export const getAnswerSynthesisJudgeUserPrompt = (
  question: string,
  context: AggregatedCourseSkills[],
  answer: string,
): string => {
  const contextString = formatContextForJudge(context);

  return `
USER QUESTION:
${question}

PROVIDED CONTEXT (Courses with matched skills and learning outcomes):
${contextString}

SYSTEM ANSWER TO EVALUATE:
${answer}

Evaluate the answer based on the criteria in the system prompt.
Return your evaluation as valid JSON.
`;
};
