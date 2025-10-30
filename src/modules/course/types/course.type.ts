import { Identifier } from 'src/common/domain/types/identifier';

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
