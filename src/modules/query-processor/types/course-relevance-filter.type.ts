import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import {
  CourseWithLearningOutcomeV2MatchWithRelevance,
  RelevanceResult,
} from './course-aggregation.type';

// Type aliases for common Map types to reduce repetition
export type CourseMatchMap = Map<string, CourseWithLearningOutcomeV2Match[]>;
export type CourseMatchWithRelevanceMap = Map<
  string,
  CourseWithLearningOutcomeV2MatchWithRelevance[]
>;

export type CourseRelevanceFilterItem = {
  subjectName: string;
  decision: 'yes' | 'no';
  reason: string;
};

export type CourseRelevanceFilterResult = {
  relevantCoursesBySkill: CourseMatchMap;
  nonRelevantCoursesBySkill: CourseMatchMap;
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};

export type CourseRelevanceFilterItemV2 = RelevanceResult & {
  subjectCode: string;
  subjectName: string;
};

export type CourseRelevanceFilterResultV2 = {
  llmAcceptedCoursesBySkill: CourseMatchWithRelevanceMap;
  llmRejectedCoursesBySkill: CourseMatchWithRelevanceMap;
  llmMissingCoursesBySkill: CourseMatchWithRelevanceMap;
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};
