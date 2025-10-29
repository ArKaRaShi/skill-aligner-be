export type RawCourseWithCLOCsvRow = {
  academic_year: string;
  semester: string;
  campus_code: string;
  faculty_code: string;
  subject_code: string;
  subject_name_th: string;
  clo_no: string;
  clo_name_th: string;
};

export type RawCourseWithCLOJsonRow = {
  academic_year: number;
  semester: number;
  campus_code: string;
  faculty_code: string;
  subject_code: string;
  subject_name_th: string;
  clo_no: number;
  clo_name_th: string;
};
