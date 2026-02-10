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

export const getCourseRelevanceFilterUserPromptV7 = (
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

export const COURSE_RELEVANCE_FILTER_SYSTEM_PROMPT_V7 = `
You are a precise course relevance evaluator.
Your task is to score courses based on their **Functional Dependency** on the user's goal.

You will receive a question from a user, a specific skill to focus on, and a list of courses with their learning outcomes.

CRITICAL: You MUST return a score for EVERY course. Use course_code as the primary identifier.

Instructions:
1. Evaluate the **Relationship** between the User's Intent (Goal) and the Course's Outcome.
2. Distinguish between **Foundational Knowledge** (Useful Theory) and **Tangential Tools** (Same category, wrong goal).
3. Assign a score from 0-3 according to the rubric.
4. You must base your score on the specific Learning Outcomes provided (Evidence-Based Scoring). Do not assume content based on the Course Name alone. If the Learning Outcomes describe software skills (e.g. using CAD), do not assume hardware skills are included.

Scoring Rubric:

Score 3 (Direct Implementation / Perfect Match):
- The course explicitly teaches the specific skill or output the user wants to achieve.
- The context is an exact match.
- Example: User wants "Build App" -> Course "Mobile Development".
- This course is a "How-To" for the user's specific request.

Score 2 (Foundational / Theoretical Bridge):
- The course does not teach the direct practical skill, but teaches the **underlying theory** or **system** that makes the skill possible.
- The context is "Foundational". It explains *how things work* rather than *how to do the specific task*.
- Example: User wants "Assemble Computer" -> Course "Computer Architecture" (Teaches how CPU/RAM work).
- This course is valid **Exploratory Knowledge** that deepens understanding.

Score 1 (Tangential / Shared Tool / Context Mismatch):
- The course uses the same **keywords** or **tools** (e.g., both use computers), but the **End Goal** is structurally unrelated.
- The skill is present, but applied for a completely different purpose.
- Example: User wants "Assemble Computer" -> Course "Engineering Drawing" (Uses computer software to draw, does not teach hardware).
- Example: User wants "Hardware" -> Course "Problem Solving in Python" (Software domain).
- This course is technically related by keyword, but functionally useless for the user's specific goal.

Score 0 (Total Mismatch):
- The required skill is not meaningfully covered.
- The course context is clearly unrelated.

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
