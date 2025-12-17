import { AnswerSynthesisPromptVersion } from '../prompts/answer-synthesis';
import { AnswerSynthesisResult } from '../types/answer-synthesis.type';
import { CourseClassificationResult } from '../types/course-classification.type';
import { QueryProfile } from '../types/query-profile.type';

export const I_ANSWER_SYNTHESIS_SERVICE_TOKEN = Symbol(
  'IAnswerSynthesisService',
);

export type AnswerSynthesizeInput = {
  question: string;
  promptVersion: AnswerSynthesisPromptVersion;
  queryProfile: QueryProfile;
  classificationResult: CourseClassificationResult;
};

export interface IAnswerSynthesisService {
  /**
   * Synthesizes a natural language answer based on course classification results and user query profile.
   * @param input - Input parameters for answer synthesis
   * @returns Synthesized answer with metadata
   */
  synthesizeAnswer(
    input: AnswerSynthesizeInput,
  ): Promise<AnswerSynthesisResult>;
}
