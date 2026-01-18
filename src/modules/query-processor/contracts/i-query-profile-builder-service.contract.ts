import { QueryProfileBuilderPromptVersion } from '../prompts/query-profile-builder';
import { QueryProfile } from '../types/query-profile.type';

export const I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN = Symbol(
  'IQueryProfileBuilderService',
);

/**
 * Service contract for building query profiles from user queries.
 *
 * @deprecated This interface is no longer used in the main query processing pipeline.
 * Query profiling has been removed as a separate step from the AnswerQuestionUseCase pipeline.
 * Language detection and query profiling are now handled inline within the pipeline.
 * This interface is kept for backward compatibility but will be removed in a future version.
 */
export interface IQueryProfileBuilderService {
  /**
   * Builds a query profile from a user query by detecting the language (Thai/English)
   * @deprecated Use inline language detection in the query processing pipeline instead
   * @param query The user query to analyze
   * @param promptVersion The prompt version to use
   * @returns A structured query profile with detected language
   */
  buildQueryProfile(
    query: string,
    promptVersion: QueryProfileBuilderPromptVersion,
  ): Promise<QueryProfile>;
}
