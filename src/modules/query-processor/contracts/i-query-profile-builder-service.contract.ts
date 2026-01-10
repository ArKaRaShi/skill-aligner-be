import { QueryProfile } from '../types/query-profile.type';

export const I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN = Symbol(
  'IQueryProfileBuilderService',
);

export interface IQueryProfileBuilderService {
  /**
   * Builds a query profile from a user query by detecting the language (Thai/English)
   * @param query The user query to analyze
   * @returns A structured query profile with detected language
   */
  buildQueryProfile(query: string): Promise<QueryProfile>;
}
