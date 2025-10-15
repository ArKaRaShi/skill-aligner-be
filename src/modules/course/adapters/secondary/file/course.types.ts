import { CloEmbeddingMetadata } from 'src/common/domain/types/clo-embedding-metadata';
import { Identifier } from 'src/common/domain/types/identifier';

export type Course = {
  courseId: Identifier;
  academicYear: number;
  semester: number;
  campusCode: string;
  facultyCode: string;
  subjectCode: string;
  subjectNameTh: string;
  courseLearningOutcomes: CourseLearningOutcome[];
};

export type CourseLearningOutcome = {
  cloId: Identifier;
  courseId: Identifier;
  cloNo: number;
  cloNameTh: string;
};

export type EmbeddedCourseLearningOutcome = CourseLearningOutcome & {
  embedding: number[];
  embeddingMetadata: CloEmbeddingMetadata;
};

export type EmbeddedCourse = Course & {
  courseLearningOutcomes: EmbeddedCourseLearningOutcome[];
};

export type EmbeddedCoursesSnapshot = {
  metadata: CloEmbeddingMetadata;
  courses: EmbeddedCourse[];
};
