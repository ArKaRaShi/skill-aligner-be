import { LearningOutcomeMatch } from 'src/modules/course/types/course-learning-outcome-v2.type';

import { GetFullCoursesDetailBySkillsParams } from '../types/course-lo-retriever.type';

export const I_COURSE_LO_RETRIEVER_SERVICE_TOKEN = Symbol(
  'ICourseLoRetrieverService',
);

export interface ICourseLoRetrieverService {
  /**
   * Retrieve learning outcomes by skills with optional LLM filtering.
   * @param params The parameters for retrieving learning outcomes.
   * @returns A map where key is skill and value is an array of filtered learning outcome matches.
   */
  retrieveLos({
    skills,
    threshold,
    topN,
    vectorDimension,
    enableLlmFilter,
  }: GetFullCoursesDetailBySkillsParams): Promise<
    Map<string, LearningOutcomeMatch[]>
  >;
}
