import { Identifier } from 'src/common/domain/types/identifier';

import {
  LearningOutcome,
  MatchedLearningOutcome,
} from './course-learning-outcome-v2.type';
import {
  CourseLearningOutcome,
  CourseLearningOutcomeMatch,
} from './course-learning-outcome.type';

export type Course = {
  courseId: Identifier;
  campusId: Identifier;
  facultyId: Identifier;
  academicYear: number;
  semester: number;

  subjectCode: string;
  subjectNameTh: string;
  subjectNameEn: string | null;
  courseLearningOutcomes: CourseLearningOutcome[];

  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CourseMatch = Omit<Course, 'courseLearningOutcomes'> & {
  cloMatches: CourseLearningOutcomeMatch[];
};

export type CourseWithLearningOutcomeV2 = Omit<
  Course,
  'courseLearningOutcomes'
> & {
  learningOutcomes: LearningOutcome[];
};

export type CourseWithLearningOutcomeV2Match = Omit<
  Course,
  'courseLearningOutcomes'
> & {
  matchedLearningOutcomes: MatchedLearningOutcome[];
  remainingLearningOutcomes: LearningOutcome[];
  allLearningOutcomes: LearningOutcome[];
};
