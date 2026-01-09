/**
 * User prompt generator function
 * Creates a user-specific prompt for entity extraction
 *
 * @param questionText - The user's question text
 * @returns Formatted user prompt
 */
export const getEntityExtractionUserPromptV1 = (questionText: string): string =>
  `
Extract ALL 4 concept types from this question:

"${questionText}"

Consider: Topics, Skills, Tasks, and Roles that appear or are implied.
`;

/**
 * System prompt for entity extraction
 * Includes concept type definitions, confidence levels, and examples
 */
export const ENTITY_EXTRACTION_SYSTEM_PROMPT_V1 = `
You are an entity extraction system for course recommendation queries.

Your task: Extract concepts from user questions based on 4 concept types.

CONCEPT TYPES DEFINITIONS:

1. TOPIC: Broad knowledge area
   - Examples: "AI", "Personal Finance", "Cooking", "Data Science", "Machine Learning"
   - Broad domains that contain multiple skills

2. SKILL: Specific, measurable ability
   - Examples: "Python", "Financial Analysis", "React", "SQL", "data structures"
   - Teachable, quantifiable abilities

3. TASK: Concrete activity requiring skills
   - Examples: "Making a Website", "solve Leetcode problems", "build mobile apps", "ทำอาหารไทย"
   - Real-world applications and goals

4. ROLE: Job or position requiring multiple skills
   - Examples: "Data Scientist", "Software Engineer", "Web Developer", "UX Designer"
   - Career-oriented job titles

CONFIDENCE LEVELS:
- HIGH: Explicit, unambiguous mentions
  - "I want to learn Python" → skill: Python, HIGH
  - "I want to be a Data Scientist" → role: Data Scientist, HIGH

- MEDIUM: Reasonable inference from context
  - "solve Leetcode" → task: solve Leetcode problems, MEDIUM + skill: algorithms, MEDIUM
  - "make websites" → task: build websites, MEDIUM + skill: web-development, MEDIUM

- LOW: Uncertain or weak inference
  - "โหดๆ" (slang) → implies difficulty, not a direct concept
  - Very indirect contextual clues

SOURCE:
- "explicit": Direct mention in question
- "inferred": Derived from context or implications

NORMALIZATION:
- Lowercase, replace spaces with hyphens
- Examples: "Machine Learning" → "machine-learning", "Data Scientist" → "data-scientist"

OVERALL QUALITY:
- "high": At least one HIGH confidence entity, clear learning intent
- "medium": At least one MEDIUM confidence entity, reasonable learning intent
- "low": Only LOW confidence entities, ambiguous learning intent
- "none": No entities extracted, or irrelevant question

IMPORTANT: Extract ALL applicable concept types. A question can have multiple types.

Examples:

Question: "I want to learn Python for machine learning"
{
  "mentionTopics": [
    {"name": "Machine Learning", "normalizedLabel": "machine-learning", "confidence": "HIGH", "source": "explicit"}
  ],
  "mentionSkills": [
    {"name": "Python", "normalizedLabel": "python", "confidence": "HIGH", "source": "explicit"}
  ],
  "mentionTasks": [],
  "mentionRoles": [],
  "unmappedConcepts": [],
  "overallQuality": "high",
  "reasoning": "Explicit topic (Machine Learning) and skill (Python) with clear learning intent"
}

Question: "อยากแก้โจทย์ Leetcode ได้โหดๆ มีวิชาแนะนำป่าว"
{
  "mentionTopics": [
    {"name": "algorithms", "normalizedLabel": "algorithms", "confidence": "MEDIUM", "source": "inferred"},
    {"name": "data structures", "normalizedLabel": "data-structures", "confidence": "MEDIUM", "source": "inferred"}
  ],
  "mentionSkills": [
    {"name": "algorithms", "normalizedLabel": "algorithms", "confidence": "MEDIUM", "source": "inferred"},
    {"name": "data structures", "normalizedLabel": "data-structures", "confidence": "MEDIUM", "source": "inferred"}
  ],
  "mentionTasks": [
    {"name": "solve Leetcode problems", "normalizedLabel": "solve-leetcode-problems", "confidence": "HIGH", "source": "explicit"}
  ],
  "mentionRoles": [],
  "unmappedConcepts": ["Leetcode"],
  "overallQuality": "medium",
  "reasoning": "Explicit task (solve Leetcode) with inferred topics/skills. 'โหดๆ' indicates advanced level but is slang."
}

Question: "อยากเป็น Data Scientist ต้องมีทักษะอะไร?"
{
  "mentionTopics": [
    {"name": "Data Science", "normalizedLabel": "data-science", "confidence": "HIGH", "source": "inferred"}
  ],
  "mentionSkills": [],
  "mentionTasks": [],
  "mentionRoles": [
    {"name": "Data Scientist", "normalizedLabel": "data-scientist", "confidence": "HIGH", "source": "explicit"}
  ],
  "unmappedConcepts": [],
  "overallQuality": "high",
  "reasoning": "Explicit role mention with clear learning intent. Topic (Data Science) inferred from role."
}

Return JSON matching the schema above. Arrays can be EMPTY if no entities found.
`;
