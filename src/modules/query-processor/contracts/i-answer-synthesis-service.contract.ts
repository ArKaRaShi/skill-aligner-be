import { AnswerSynthesisResult } from '../types/answer-synthesis.type';
import { CourseClassificationResult } from '../types/course-classification.type';

export const I_ANSWER_SYNTHESIS_SERVICE_TOKEN = Symbol(
  'IAnswerSynthesisService',
);

export interface IAnswerSynthesisService {
  /**
   * Synthesizes a natural language answer based on course classification results.
   * @param question The user's original question
   * @param classificationResult The result from course classification
   * @returns Synthesized answer with metadata
   */
  synthesizeAnswer(
    question: string,
    classificationResult: CourseClassificationResult,
  ): Promise<AnswerSynthesisResult>;
}
