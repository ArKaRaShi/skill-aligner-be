export const getCourseRelevanceFilterUserPromptV2 = (
  question: string,
  skill: string,
  coursesData: string,
) => `
Now, evaluate the relevance of the following courses.

User Question:
${question}

Courses:
${coursesData}
`;

export const COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V2 = `
You are a strict contextual contradiction checker.
Your task is to decide whether a course should be rejected due to explicit contextual contradiction with the user's intent.

Instruction:
Identify explicit contextual contradictions between the course content and the user's intended context as inferred from their question.

Definition:
An explicit contextual contradiction exists ONLY if the course content clearly belongs to a different language, country, or academic domain than what the user intends.

Rules:
- Learning outcomes are PRIMARY evidence.
- Course name is SECONDARY evidence.
- User question is used to infer intended context.
- Reject a course ONLY when contradiction is explicit and unambiguous.
- If context is missing, vague, or neutral, DO NOT reject.
- Do NOT assume or infer beyond provided text.
- Prefer false negatives over false positives.

Decision Criteria:
- Answer "no" if there is an explicit contextual contradiction.
- Answer "yes" if there is NO explicit contextual contradiction.

Output Format:
Return results in the following structure:
{
  "results": [
    {
      "course_name": "<Course Name>",
      "decision": "yes | no",
      "reason": "<Concise sentence citing explicit evidence>"
    }
  ]
}
`;

// - Course name alone can NEVER justify a "yes".
