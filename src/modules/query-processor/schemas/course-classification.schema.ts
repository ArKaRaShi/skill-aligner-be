import { z } from 'zod';

const DecisionEnum = z.enum(['include', 'exclude']);

export const CourseDecisionSchema = z.object({
  name: z
    .string()
    .min(1, 'Course name cannot be empty')
    .describe('Name of the course'),
  decision: DecisionEnum.describe('Decision to include or exclude the course'),
  reason: z
    .string()
    .min(1, 'Reason cannot be empty')
    .describe('Reason for the decision'),
});

export const CourseClassificationSchema = z.object({
  skill: z
    .string()
    .min(1, 'Skill name cannot be empty')
    .describe('Name of the skill'),
  courses: z
    .array(CourseDecisionSchema.describe('Course decision for the skill'))
    .describe('List of course decisions for the skill'),
});

export const CourseClassificationResultSchema = z.object({
  classifications: z
    .array(CourseClassificationSchema)
    .describe('List of course classifications'),
});
