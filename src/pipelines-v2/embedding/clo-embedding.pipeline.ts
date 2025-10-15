import { CoursePreprocessingOutput } from '../preprocessing/course-preprocessing.pipeline';

export interface CloEmbeddingOutput {
  vectors: unknown;
}

export class CloEmbeddingPipeline {
  async execute(
    input: CoursePreprocessingOutput,
  ): Promise<CloEmbeddingOutput> {
    return {
      vectors: input.preprocessedCourses,
    };
  }
}

