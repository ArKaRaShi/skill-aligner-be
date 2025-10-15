import { z } from 'zod';

const stripLeadingNumber = (name: string) =>
  (name ?? '').replace(/^\s*\d+\s*[.\-)\]]?\s*/, '').trim();

const stripLeadingNisit = (name: string) =>
  (name ?? '').replace(/^\s*นิสิต\s*/i, '').trim();

// such as CLO1, CLO2, CLO, ...
const stripLeadingClo = (name: string) =>
  (name ?? '').replace(/^\s*CLO\s*\d*\s*[:.-]?\s*/i, '').trim();

const AcademicYearBE = z.preprocess(
  (value) => parseInt(String(value).trim(), 10),
  z.number().int().min(2400).max(4000),
);

const NonEmptyTrimmed = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, 'required');

const Semester = z.preprocess(
  (value) => parseInt(String(value).trim(), 10),
  z.number().int().min(0).max(2),
);

const CLOName = z
  .string()
  .transform((value) => {
    let v = value.trim();
    // apply multiple cleaning steps
    // in order: strip leading number, strip leading "CLO", strip leading "นิสิต"
    v = stripLeadingNumber(v);
    v = stripLeadingClo(v);
    v = stripLeadingNisit(v);
    return v;
  })
  .refine(
    (value) => {
      if (!value) return false;
      if (/^[-.,\s]*$/.test(value)) return false;
      if (/^[\d\s,.-]+$/.test(value)) return false;
      if (value.length < 3) return false;
      return true;
    },
    { message: 'meaningless or empty CLO name' },
  );

const CLONo = z.preprocess(
  (value) => parseInt(String(value).trim(), 10),
  z.number().int().min(1),
);

export const CsvRowSchema = z.object({
  academic_year: AcademicYearBE,
  subject_code: NonEmptyTrimmed,
  subject_name_th: NonEmptyTrimmed,
  campus_code: NonEmptyTrimmed,
  faculty_code: NonEmptyTrimmed,
  semester: Semester,
  clo_no: CLONo,
  clo_name_th: CLOName,
});

export type CsvRow = z.infer<typeof CsvRowSchema>;

const CloEmbeddingMetadataSchema = z.object({
  model: NonEmptyTrimmed,
  dimension: z.number().int().positive(),
  embeddedAt: NonEmptyTrimmed,
  by: NonEmptyTrimmed,
  note: z.string().optional(),
  originalText: z.string().optional(),
  adjustedText: z.string().optional(),
});

const EmbeddedCourseLearningOutcomeSchema = z.object({
  cloId: NonEmptyTrimmed,
  courseId: NonEmptyTrimmed,
  cloNo: z.number().int().min(1),
  cloNameTh: NonEmptyTrimmed,
  embedding: z.array(z.number()),
  embeddingMetadata: CloEmbeddingMetadataSchema,
});

const EmbeddedCourseSchema = z.object({
  courseId: NonEmptyTrimmed,
  academicYear: z.number().int(),
  semester: z.number().int(),
  campusCode: NonEmptyTrimmed,
  facultyCode: NonEmptyTrimmed,
  subjectCode: NonEmptyTrimmed,
  subjectNameTh: NonEmptyTrimmed,
  courseLearningOutcomes: z.array(EmbeddedCourseLearningOutcomeSchema),
});

export const EmbeddedCoursesSnapshotSchema = z.object({
  metadata: CloEmbeddingMetadataSchema,
  courses: z.array(EmbeddedCourseSchema),
});
