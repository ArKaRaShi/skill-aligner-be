import { AnswerSynthesisResult } from '../types/answer-synthesis.type';
import { CourseClassificationResult } from '../types/course-classification.type';
import { QueryProfile } from '../types/query-profile.type';

export const I_ANSWER_SYNTHESIS_SERVICE_TOKEN = Symbol(
  'IAnswerSynthesisService',
);

export interface IAnswerSynthesisService {
  /**
   * Synthesizes a natural language answer based on course classification results and user query profile.
   * @param question The user's original question
   * @param queryProfile The user's query profile containing intents, preferences, and background
   * @param classificationResult The result from course classification
   * @returns Synthesized answer with metadata
   */
  synthesizeAnswer(
    question: string,
    queryProfile: QueryProfile,
    classificationResult: CourseClassificationResult,
  ): Promise<AnswerSynthesisResult>;
}
