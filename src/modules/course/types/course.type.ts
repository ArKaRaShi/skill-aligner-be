import { Identifier } from 'src/common/domain/types/identifier';

import { CourseClickLog } from './course-click-log.type';
import {
  LearningOutcome,
  MatchedLearningOutcome,
} from './course-learning-outcome-v2.type';
import { CourseLearningOutcomeMatch } from './course-learning-outcome.type';
import { CourseOffering } from './course-offering.type';

export type Course = {
  id: Identifier;
  campusId: Identifier;
  facultyId: Identifier;

  subjectCode: string;
  subjectName: string;
  isGenEd: boolean;
  courseLearningOutcomes: LearningOutcome[];
  courseOfferings: CourseOffering[];
  courseClickLogs: CourseClickLog[];

  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CourseMatch = Omit<Course, 'courseLearningOutcomes'> & {
  cloMatches: CourseLearningOutcomeMatch[];
};

export type CourseWithLearningOutcomeV2Match = Omit<
  Course,
  'courseLearningOutcomes'
> & {
  matchedLearningOutcomes: MatchedLearningOutcome[];
  remainingLearningOutcomes: LearningOutcome[];
  allLearningOutcomes: LearningOutcome[];
};
