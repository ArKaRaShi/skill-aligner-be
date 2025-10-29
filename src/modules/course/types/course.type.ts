import { Identifier } from 'src/common/domain/types/identifier';

import {
  CourseLearningOutcome,
  CourseLearningOutcomeMatch,
} from './course-learning-outcome.type';

export type Course = {
  courseId: Identifier;
  campusCode: string;
  facultyCode: string;
  academicYear: number;
  semester: number;

  subjectCode: string;
  subjectNameTh: string;
  subjectNameEn: string | null;
  courseLearningOutcomes: CourseLearningOutcome[];

  createdAt: Date;
  updatedAt: Date;
};

export type CourseMatch = Omit<Course, 'courseLearningOutcomes'> & {
  cloMatches: CourseLearningOutcomeMatch[];
};
