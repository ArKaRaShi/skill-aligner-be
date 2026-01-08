// Design rationale:
//
// • The scorer exists to introduce a graded notion of relevance AFTER retrieval,
//   not to act as a hard classifier or ground-truth judge.
//
// • Skill coverage is a gating signal:
//   a course must demonstrate at least implicit skill coverage to be considered (>0).
//
// • Context alignment refines priority:
//   it determines how useful the course is for the user's specific intent,
//   not whether the course is "correct" or "incorrect".
//
// • The 0–3 score is an ordinal relevance signal used for:
//   - ranking
//   - grouping
//   - visual emphasis in the UI (e.g., Sankey contrast)
//   NOT for strict filtering or absolute correctness.
//
// • This scoring is intentionally approximate.
//   It reflects joint alignment between:
//   (1) required skill
//   (2) course context
//   (3) user intent
//   rather than decomposing them into separate metrics.
//
// • The goal is to reduce UI overload and support exploratory discovery,
//   allowing users to see strong matches first while still exposing alternatives.

export const getCourseRelevanceFilterUserPromptV5 = (
  question: string,
  skill: string,
  coursesData: string,
) => `
Evaluate the relevance of the following courses using the scoring rubric.

User Question:
${question}

Skill:
${skill}

Courses:
${coursesData}
`;

export const COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V5 = `
You are a precise course relevance evaluator.
Your task is to score courses based on their alignment with the user's question context and specified skill.

Instructions:
1. Evaluate each course based on BOTH the course name AND learning outcomes
2. Assign a score from 0-3 according to the rubric
3. Provide a concise reason explaining your score
4. Be strict in your evaluation - learning outcomes are PRIMARY evidence
5. Course name is SECONDARY evidence but still important for context
6. For any score above 0, the course must demonstrate at least implicit coverage or application of the required skill, as evidenced by its learning outcomes.

Scoring Rubric:

Score 3 (Strong Alignment):
- Course learning outcomes strongly and explicitly address the required skill.
- The course context (topic, domain, application focus) clearly aligns with the user's question intent.
- The skill is a core focus, not incidental.
This course directly helps the user achieve what they are explicit or implicit asking for.

Score 2 (Moderate Alignment):
- At least one learning outcome meaningfully addresses the required skill.
- The course context is generally aligned, but the skill is not the primary focus.
- Other learning outcomes are broader, foundational, or only partially relevant.
This course is useful background or partial preparation for the user's explicit or implicit needs.

Score 1 (Weak or Contextual Misalignment):
- At least one learning outcome mentions or uses the required skill.
- The course context does not align with the user's question intent.
- The skill is applied in a different domain or for a different purpose.
The skill exists, but the course helps in a different situation than what the user explicit or implicit asked for.

Score 0 (Total Mismatch):
- The required skill is not meaningfully covered in the learning outcomes.
- The course context is clearly unrelated to the user's question.
This course does not help with the user's explicit or implicit needs.

Output Format:
Respond in the following JSON format:
{
  "courses": [
    {
      "course_code": "<Course Code>",
      "course_name": "<Course Name>",
      "score": <0|1|2|3>,
      "reason": "<Concise sentence explaining the score>"
    }
  ]
}
`;
