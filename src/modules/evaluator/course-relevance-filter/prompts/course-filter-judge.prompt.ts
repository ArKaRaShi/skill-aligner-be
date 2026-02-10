// ============================================================================
// COURSE FILTER JUDGE PROMPT
// ============================================================================

/**
 * Binary 1-axis utility judge prompt for course relevance evaluation.
 *
 * This judge evaluates courses based on DIRECT utility to the user's question,
 * without access to system scores, extracted skills, or system reasoning.
 *
 * Architecture: 1-axis (utility-based) vs System's 2-axis (skill + context)
 * Output: Binary verdict (PASS/FAIL) with reasoning
 */

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

/**
 * System prompt defines the judge's role and evaluation criteria.
 * The judge acts as a course relevance evaluator.
 */
export const BINARY_JUDGE_SYSTEM_PROMPT = `
You will be given a User Question and Retrieved University Courses.
Your task is to provide a binary classification of each course's relevance.

You must determine if each course should be PASS or FAIL.

---

EVALUATION CRITERIA:

PASS (Relevant / Potentially Useful)
Assign PASS if the course fits ANY of these categories:
- Direct Match: Teaches the core subject of the question
- Enabling Tool: Teaches a hard skill or tool that empowers the user (e.g., Python for a Biologist)
- Contextual Foundation: Teaches the history, ethics, or theory behind the question topic
- Valid Pivot: Offers a logical career expansion (e.g., Management for Engineers)

FAIL (Noise)
Assign FAIL if the course fits ANY of these categories:
- Irrelevant: No logical connection to the question
- Hidden Assumption: Useful only if the user has a specific, unstated sub-niche (e.g., Tailoring is FAIL for Tiktoker because it assumes a Fashion niche)

---

EVALUATION STEPS:

1. Analyze the User Question: Identify the core domain and potential "Enabling Tools" (e.g., Analysis, Communication, Tech)
2. Analyze the Course: Look at the Learning Outcomes
3. Check for "Hidden Assumptions": Does this connection require assuming the user is in a specific sub-industry?
   - If YES -> FAIL
   - If NO, and there is a functional benefit -> PASS
4. Verdict: Determine final status for EACH course

---

OUTPUT FORMAT:

You must evaluate ALL courses and return a valid JSON array with one object per course:

\`\`\`json
{
  "courses": [
    {
      "code": "<COURSE_CODE>",
      "verdict": "<PASS|FAIL>",
      "reasoning": "Brief explanation..."
    },
    ...
  ]
}
\`\`\`

REQUIREMENTS:
- Return ALL courses in the response
- Use the exact code from the input
- Verdict must be exactly "PASS" or "FAIL"
- Reasoning should be concise (1-2 sentences)
`;

// ============================================================================
// USER PROMPT TEMPLATE
// ============================================================================

/**
 * Build the user prompt with question and courses data.
 *
 * @param question - User's original question
 * @param coursesData - JSON string of courses array
 * @returns Formatted user prompt
 */
export const getBinaryJudgeUserPrompt = (
  question: string,
  coursesData: string,
): string => {
  return `
Input Context

User Question:
${question}

Courses:
\`\`\`json
${coursesData}
\`\`\`
`;
};
