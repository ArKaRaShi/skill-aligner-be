export type CleanCourseWithCLO = {
  academic_year: number;
  semester: number;
  campus_code: string;
  faculty_code: string;
  subject_code: string;
  subject_name_th: string;
  clo_no: number;
  original_clo_name_th: string;
  clean_clo_name_th: string;
  skipEmbedding: boolean;
  keywords: string[];
};
