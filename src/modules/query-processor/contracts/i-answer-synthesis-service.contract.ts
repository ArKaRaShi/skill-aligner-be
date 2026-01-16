import { AnswerSynthesisPromptVersion } from '../prompts/answer-synthesis';
import { Language } from '../schemas/query-profile-builder.schema';
import {
  AnswerSynthesisResult,
  AnswerSynthesisStreamResult,
} from '../types/answer-synthesis.type';
import { AggregatedCourseSkills } from '../types/course-aggregation.type';

export const I_ANSWER_SYNTHESIS_SERVICE_TOKEN = Symbol(
  'IAnswerSynthesisService',
);

export type AnswerSynthesizeInput = {
  question: string;
  promptVersion: AnswerSynthesisPromptVersion;
  language: Language;
  aggregatedCourseSkills: AggregatedCourseSkills[];
};

export type AnswerSynthesizeStreamInput = {
  question: string;
  promptVersion: AnswerSynthesisPromptVersion;
  language: Language;
  aggregatedCourseSkills: AggregatedCourseSkills[];
};

export interface IAnswerSynthesisService {
  /**
   * Synthesizes a natural language answer based on course classification results and language.
   * @param input - Input parameters for answer synthesis
   * @returns Synthesized answer with metadata
   */
  synthesizeAnswer(
    input: AnswerSynthesizeInput,
  ): Promise<AnswerSynthesisResult>;

  /**
   * Streams a natural language answer based on course classification results and language.
   * Returns an async generator that yields text chunks as they're generated.
   *
   * @param input - Input parameters for answer synthesis
   * @returns AnswerSynthesisStreamResult with stream, immediate question, and deferred metadata promise
   */
  synthesizeAnswerStream(
    input: AnswerSynthesizeStreamInput,
  ): AnswerSynthesisStreamResult;
}
