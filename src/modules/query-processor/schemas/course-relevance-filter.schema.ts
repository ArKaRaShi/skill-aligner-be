import { z } from 'zod';

const FilterDecisionEnum = z.enum(['yes', 'no']);

export const CourseFilterSchema = z.object({
  course_name: z
    .string()
    .min(1, 'Course name cannot be empty')
    .describe('Name of the course'),
  decision: FilterDecisionEnum.describe(
    'Binary decision if course is relevant (yes/no)',
  ),
  reason: z
    .string()
    .min(1, 'Reason cannot be empty')
    .describe(
      'Reason for the filter decision based on LOs supporting the skill, with user question influence if applicable',
    ),
});

export const CourseRelevanceFilterResultSchema = z.object({
  courses: z
    .array(CourseFilterSchema.describe('Course filter decisions'))
    .describe('Array of course relevance decisions'),
});
