type CanonicalCLO = {
  cloNo: number;
  cloNameTh: string;
  cloId?: string; // optional if DB will generate
};

type CanonicalCourse = {
  campusCode: string;
  facultyCode: string;
  academicYear: number;
  semester: number;
  subjectCode: string;
  subjectNameTh: string;
  courseId?: string; // optional DB id
  cloList: CanonicalCLO[]; // aggregated canonical CLOs
};
