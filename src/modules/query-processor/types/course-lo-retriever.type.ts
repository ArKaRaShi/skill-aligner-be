import { LearningOutcomeMatch } from 'src/modules/course/types/course-learning-outcome-v2.type';

export type GetFullCoursesDetailBySkillsParams = {
  skills: string[];
  threshold?: number;
  topN?: number;
  vectorDimension?: 768 | 1536;
  enableLlmFilter?: boolean;
};

export type CourseDetailWithLos = {
  courseId: string;
  subjectCode: string;
  subjectNameTh: string;
  subjectNameEn?: string;
  academicYear: number;
  semester: number;
  learningOutcomes: LearningOutcomeMatch[];
};
