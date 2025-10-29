import { z } from 'zod';

type InputSkill = {
  name: string;
  description: string;
};

const classificationEnum = z.enum(['HARD', 'SOFT', 'HYBRID']);

export const schema = z.array(
  z.object({
    name: z.string(),
    classification: classificationEnum,
    reason: z.string(),
    uncertain: z.boolean(),
  }),
);

export function classifySkillBatchPrompt(skills: InputSkill[]): {
  promptVersion: 'v1';
  prompt: string;
} {
  return {
    promptVersion: 'v1',
    prompt: `
You are an expert career counselor specializing in skill classification. Your task is to classify each skill into one of the following categories based on its name and description:
Given the following skills

Classify each skill into one of the following categories:
1. Hard Skill – technical, measurable, or procedural abilities that rely on domain-specific knowledge or formal training.
2. Soft Skill – interpersonal, emotional, or behavioral abilities that affect how work is performed and how people interact.
3. Hybrid Skill – skills that combine elements of both hard and soft skills.

Rules:
1. Base your decision only on the skill’s name and description.
2. Do not consider proficiency level, organizational context, or inferred use cases.
3. Do not guess beyond the given text.

Given the following skills
Skills:
${skills
  .map(
    (skill, index) => `
${index + 1}.
Name: ${skill.name}
Description: ${skill.description}
`,
  )
  .join('\n')}
  
Example:
{
    "skill": "Python programming",
    "classification": "Hard",
    "reason": "Requires technical knowledge of syntax, logic, and programming tools.",
    "uncertain": false
},
{
    "skill": "Conflict resolution",
    "classification": "Soft",
    "reason": "Involves emotional intelligence, empathy, and interpersonal negotiation.",
    "uncertain": false
},
{
    "skill": "Project management",
    "classification": "Soft",
    "reason": "Combines technical planning tools with leadership and communication abilities.",
    "uncertain": true
}
`,
  };
}
