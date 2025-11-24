import { z } from 'zod';

const DecisionEnum = z.enum(['include', 'exclude']);

export const CourseClassificationSchema = z.object({
  skill: z.string().min(1, 'Skill name cannot be empty'),
  courses: z.array(
    z.object({
      name: z.string().min(1, 'Course name cannot be empty'),
      decision: DecisionEnum.describe(
        'Decision to include or exclude the course',
      ),
      reason: z.string().min(1, 'Reason cannot be empty'),
    }),
  ),
});

export const CourseClassificationResultSchema = z.object({
  classifications: z.array(CourseClassificationSchema),
});
