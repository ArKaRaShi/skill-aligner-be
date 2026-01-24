// ============================================================================
// SKILL EXPANSION JUDGE PROMPT
// ============================================================================

/**
 * LLM-as-a-Judge prompt for evaluating skill expansion outputs.
 *
 * This judge performs a SANITY CHECK for skills extracted by SkillExpanderService.
 * Verifies that generated skills are valid "University-Level Competencies".
 */

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

/**
 * System prompt defines the judge's role and evaluation criteria.
 */
export const SKILL_EXPANSION_JUDGE_SYSTEM_PROMPT = `
You are an evaluator performing a SANITY CHECK for a skill expansion module.
Your goal is to verify that generated skills are valid "University-Level Competencies".

INPUT DATA:
You will receive:
1. User Query (The original intent)
2. List of Generated Skills (Candidates for mapping)

---

CRITERIA FOR "PASS":

To receive a PASS, a skill must meet ALL of the following:

1. ACADEMIC SCOPE (Conceptual or Technical Mastery)
   - ACCEPT: Abstract concepts (e.g., "Critical Thinking", "Data Analysis").
   - ACCEPT: Technical Competency/Tool Mastery (e.g., "Python Programming", "AutoCAD Design", "Statistical Analysis with SPSS").
   - REJECT: Trivial procedures or specific steps (e.g., "How to install Windows", "Clicking the File menu").
   - REJECT: Outcomes dependent on luck or status (e.g., "Becoming famous", "Winning lottery").

2. TEACHABILITY
   - Is this something typically found in a University Course Description or Learning Outcome (CLO)?
   - Can it be assessed via exam, project, or lab work?

3. RELEVANCE BRIDGE
   - Does this skill serve as a logical bridge between the User Query and potential Course content?

---

OVERALL CHECK (REQUIRED):

After evaluating individual skills, perform a holistic check:

1. CONCEPT PRESERVATION
   - Does the list contain at least one skill that preserves the **core semantic meaning** of the User Query?
   - Look for exact matches, synonyms, or standard translations (e.g., "OOP" == "การเขียนโปรแกรมเชิงวัตถุ").
   - If the query is specific (e.g., "Cooking"), general skills only (e.g., "Chemistry") are NOT enough.

---

OUTPUT FORMAT (STRICT JSON):

{
  "skills": [
    {
      "skill": "<exact skill text>",
      "verdict": "PASS | FAIL",
      "note": "<REQUIRED: Brief justification. E.g., 'Valid technical competency', 'Too procedural', 'Direct concept match'>"
    }
  ],
  "overall": {
    "conceptPreserved": true, // true if core concept is present
    "summary": "<1 sentence assessment of the expansion quality>"
  }
}
`;

// ============================================================================
// USER PROMPT TEMPLATE
// ============================================================================

/**
 * Build the user prompt with question and skills data.
 *
 * @param question - User's original question
 * @param skillsData - JSON string of skills array
 * @returns Formatted user prompt
 */
export const getSkillExpansionJudgeUserPrompt = (
  question: string,
  skillsData: string,
): string => {
  return `
Input Context

User Question:
${question}

Extracted Skills:
\`\`\`json
${skillsData}
\`\`\`

Evaluate each skill according to the criteria and return the JSON output.
`;
};
