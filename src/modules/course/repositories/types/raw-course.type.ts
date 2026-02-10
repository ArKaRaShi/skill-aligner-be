export type RawCourse = {
  id: string;
  campus_id: string;
  faculty_id: string;
  subject_code: string;
  subject_name: string;
  is_gen_ed: boolean;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any> | null;
};

export type RawCourseLearningOutcome = {
  id: string;
  original_clo_name: string;
  original_clo_name_en: string | null;
  cleaned_clo_name_th: string;
  cleaned_clo_name_en: string | null;
  embedding: number[];
  skip_embedding: boolean;
  is_embedded: boolean;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
};

export type RawCourseCLO = {
  id: string;
  course_id: string;
  clo_id: string;
  clo_no: number;
  created_at: Date;
  updated_at: Date;
  course: RawCourse | null;
  learning_outcome: RawCourseLearningOutcome | null;
};

export type RawCourseWithCLOs = RawCourse & {
  course_clos: RawCourseCLO[];
};
