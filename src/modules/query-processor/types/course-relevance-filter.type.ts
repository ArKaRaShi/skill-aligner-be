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
  model: string;
  userPrompt: string;
  systemPrompt: string;
  promptVersion: string;
  hyperParameters?: Record<string, any>;
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
  model: string;
  userPrompt: string;
  systemPrompt: string;
  promptVersion: string;
  hyperParameters?: Record<string, any>;
};
