export type FindCourseByIdRawRow = {
  course_id: string;
  campus_id: string;
  faculty_id: string;
  academic_year: number;
  semester: number;
  subject_code: string;
  subject_name_th: string;
  subject_name_en: string | null;
  course_metadata: Record<string, any> | null;
  course_created_at: Date;
  course_updated_at: Date;

  course_clo_id: string;
  clo_no: number;
  course_clo_created_at: Date;
  course_clo_updated_at: Date;

  clo_id: string;
  original_clo_name: string;
  original_clo_name_en: string | null;
  cleaned_clo_name_th: string;
  cleaned_clo_name_en: string | null;
  embedding_768: unknown;
  skip_embedding: boolean;
  has_embedding_768: boolean;
  has_embedding_1536: boolean;
  clo_metadata: Record<string, any> | null;
  clo_created_at: Date;
  clo_updated_at: Date;
};
