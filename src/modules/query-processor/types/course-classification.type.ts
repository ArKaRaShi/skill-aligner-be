import { z } from 'zod';

import { CourseClassificationResultSchema } from '../schemas/course-classification.schema';

export type CourseClassificationResult = z.infer<
  typeof CourseClassificationResultSchema
> & {
  question: string;
  context: string;
};
