import { z } from 'zod';

export const AnswerGenerationSchema = z.object({
  answerText: z.string().min(1, 'Answer cannot be empty'),
  includes: z
    .array(
      z.object({
        skill: z.string().min(1, 'Skill name cannot be empty'),
        courses: z.array(
          z.object({
            courseName: z.string().min(1, 'Course name cannot be empty'),
            reason: z.string().min(1, 'Reason cannot be empty'),
          }),
        ),
      }),
    )
    .default([]),
  excludes: z
    .array(
      z.object({
        skill: z.string().min(1, 'Skill name cannot be empty'),
        courses: z.array(
          z.object({
            courseName: z.string().min(1, 'Course name cannot be empty'),
            reason: z.string().min(1, 'Reason cannot be empty'),
          }),
        ),
      }),
    )
    .default([]),
});

export type LlmAnswerGeneration = z.infer<typeof AnswerGenerationSchema>;
