export type RawCourse = {
  id: string;
  campus_code: string;
  faculty_code: string;
  academic_year: number;
  semester: number;
  subject_code: string;
  subject_name_th: string;
  created_at: Date;
  updated_at: Date;
};

export type RawCourseLearningOutcome = {
  id: string;
  course_id: string;
  clo_no: number;
  clo_name_th: string;
  embedding: number[];
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
};

export type RawCourseWithCLOs = RawCourse & {
  course_learning_outcomes?: RawCourseLearningOutcome[];
};
