import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import {
  CourseWithLearningOutcomeV2Match,
  CourseWithLearningOutcomeV2MatchWithScore,
} from 'src/modules/course/types/course.type';

export type CourseRelevanceFilterItem = {
  courseName: string;
  decision: 'yes' | 'no';
  reason: string;
};

export type CourseRelevanceFilterResult = {
  relevantCoursesBySkill: Map<string, CourseWithLearningOutcomeV2Match[]>;
  nonRelevantCoursesBySkill: Map<string, CourseWithLearningOutcomeV2Match[]>;
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};

export type CourseRelevanceFilterItemV2 = {
  courseCode: string;
  courseName: string;
  score: number;
  reason: string;
};

export type CourseRelevanceFilterResultV2 = {
  relevantCoursesBySkill: Map<
    string,
    CourseWithLearningOutcomeV2MatchWithScore[]
  >;
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};
