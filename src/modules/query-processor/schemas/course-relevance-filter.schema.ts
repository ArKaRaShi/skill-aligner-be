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

// V2 Schema with scoring
export const CourseFilterSchemaV2 = z.object({
  course_code: z
    .string()
    .min(1, 'Course code cannot be empty')
    .describe('Code of the course'),
  course_name: z
    .string()
    .min(1, 'Course name cannot be empty')
    .describe('Name of the course'),
  score: z
    .number()
    .int()
    .min(0, 'Score must be at least 0')
    .max(3, 'Score must be at most 3')
    .describe('Relevance score from 0-3 based on alignment'),
  reason: z
    .string()
    .min(1, 'Reason cannot be empty')
    .describe(
      'Reason for the score based on course name and learning outcomes alignment',
    ),
});

export const CourseRelevanceFilterResultSchemaV2 = z.object({
  courses: z
    .array(CourseFilterSchemaV2.describe('Course filter decisions with scores'))
    .describe('Array of course relevance decisions with scores'),
});
