import { PrismaClient } from '@prisma/client';

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { Identifier } from 'src/common/domain/types/identifier';
import { FileHelper } from 'src/common/helpers/file';

const prisma = new PrismaClient();

/** ───────── helpers ───────── */
const stripLeadingNumber = (name: string) =>
  (name ?? '').replace(/^\s*\d+\s*[.\-)\]]?\s*/, '').trim();

/** Academic year (BE) sanity: 2400–4000 */
const AcademicYearBE = z.preprocess(
  (v) => parseInt(String(v).trim(), 10),
  z.number().int().min(2400).max(4000),
);

const NonEmptyTrimmed = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, 'required');

const Semester = z.preprocess(
  (v) => parseInt(String(v).trim(), 10),
  z.number().int().min(0).max(2),
);

// e.g. "1,2,3" (weird)
// e.g. "1. Understand ..." -> "Understand ..."
// e.g. "  2 - Be able to ..." -> "Be able to ..."
// e.g. "3) Apply ..." -> "Apply ..."
// e.g. " 4] Analyze ..." -> "Analyze ..."
// e.g. "-"
// e.g. "" (empty)

// Cleans and validates a CLO name:
// Strips leading numbers or symbols
// Rejects meaningless values like "-", ",", "1,2,3", or empty
// Rejects super short tokens (< 3 chars)
// Logs the ones we filtered (later)
const CLOName = z
  .string()
  .transform((s) => stripLeadingNumber(s || '').trim())
  .refine(
    (s) => {
      // reject obvious junk
      if (!s) return false;
      if (/^[-.,\s]*$/.test(s)) return false; // only symbols
      if (/^[\d\s,.-]+$/.test(s)) return false; // looks like numbers/commas
      if (s.length < 3) return false; // too short
      return true;
    },
    { message: 'meaningless or empty CLO name' },
  );

const CLONo = z.preprocess(
  (v) => parseInt(String(v).trim(), 10),
  z.number().int().min(1),
);

/** ───────── schema ───────── */
const CsvRowSchema = z.object({
  academic_year: AcademicYearBE,
  subject_code: NonEmptyTrimmed,
  subject_name_th: NonEmptyTrimmed,
  campus_code: NonEmptyTrimmed,
  faculty_code: NonEmptyTrimmed,
  semester: Semester,
  clo_no: CLONo,
  clo_name_th: CLOName,
});
type CsvRow = z.infer<typeof CsvRowSchema>;

type Course = {
  courseId: Identifier;
  academicYear: number;
  semester: number;
  campusCode: string;
  facultyCode: string;
  subjectCode: string;
  subjectNameTh: string;
  courseLearningOutcomes: CourseLearningOutcome[];
};

type CourseLearningOutcome = {
  cloId: Identifier;
  courseId: Identifier;
  cloNo: number;
  cloNameTh: string;
};

/** ───────── load + validate (no row skips) ───────── */
async function loadCsv(): Promise<CsvRow[]> {
  const FILE_PATH = path.resolve(process.cwd(), 'data/courses.csv');
  console.log(`📄 Reading CSV from: ${FILE_PATH}`);

  let raw: unknown[];
  try {
    raw = await FileHelper.readCSVFile<unknown>(FILE_PATH);
  } catch (e) {
    console.error('💥 Failed to read CSV:', e);
    throw e;
  }

  const parsed: CsvRow[] = [];
  const errors: Array<{ index: number; issues: string[]; sample: any }> = [];

  raw.forEach((row, i) => {
    const r = CsvRowSchema.safeParse(row);
    if (r.success) parsed.push(r.data);
    else {
      const issues = r.error.issues.map(
        (iss) => `${iss.path.join('.') || '(root)'}: ${iss.message}`,
      );
      errors.push({ index: i + 1, issues, sample: row });
    }
  });

  console.log(
    `✅ Loaded ${raw.length} rows, valid: ${parsed.length}, invalid: ${errors.length}`,
  );
  if (errors.length) {
    console.warn('⚠️  First 3 validation errors:');
    errors.slice(0, 3).forEach((e, k) => {
      console.warn(
        `  #${k + 1} row=${e.index}\n    issues: ${e.issues.join(' | ')}\n    sample: ${JSON.stringify(
          e.sample,
        )}`,
      );
    });
  }

  return parsed;
}

/** ───────── combine (distinct per semester; drop courses w/ 0 CLOs) ───────── */
function combineSameCourse(records: CsvRow[]): Course[] {
  const byCourse = new Map<string, { course: Course; seenCLO: Set<string> }>();

  let createdCourses = 0;
  let dupCLOs = 0;

  for (const r of records) {
    // 👉 include semester in the grouping key (no combining S0/S1/S2)
    const courseKey = [
      r.academic_year,
      r.subject_code,
      r.campus_code,
      r.faculty_code,
      r.semester,
    ].join('|');

    let bucket = byCourse.get(courseKey);
    if (!bucket) {
      const course: Course = {
        courseId: uuidv4() as Identifier,
        academicYear: r.academic_year,
        semester: r.semester,
        campusCode: r.campus_code,
        facultyCode: r.faculty_code,
        subjectCode: r.subject_code,
        subjectNameTh: r.subject_name_th,
        courseLearningOutcomes: [],
      };
      bucket = { course, seenCLO: new Set() };
      byCourse.set(courseKey, bucket);
      createdCourses++;
    }

    const cloNo = r.clo_no;
    const cloName = r.clo_name_th;

    // Dedup within the (year,subject,campus,faculty,semester) bucket
    const cloKey = `${cloNo}|${cloName}`;
    if (bucket.seenCLO.has(cloKey)) {
      dupCLOs++;
      continue;
    }

    bucket.course.courseLearningOutcomes.push({
      cloId: uuidv4() as Identifier,
      courseId: bucket.course.courseId,
      cloNo,
      cloNameTh: cloName,
    });
    bucket.seenCLO.add(cloKey);
  }

  // Sort CLOs
  const allCourses = Array.from(byCourse.values()).map((b) => {
    b.course.courseLearningOutcomes.sort((a, b) => a.cloNo - b.cloNo);
    return b.course;
  });

  // FINAL FILTER: drop courses with 0 CLOs
  const result = allCourses.filter((c) => c.courseLearningOutcomes.length > 0);
  const droppedCourses = allCourses.length - result.length;

  console.log('——— Combine summary ———');
  console.log(`🆕 Courses created (per semester): ${createdCourses}`);
  console.log(`🔁 Duplicate CLO rows ignored: ${dupCLOs}`);
  console.log(`🚫 Dropped courses (0 CLOs after combine): ${droppedCourses}`);
  console.log(`📦 Output courses: ${result.length}`);

  // sanity: no zero-CLO courses
  const zeroCLOCourses = result.filter(
    (c) => c.courseLearningOutcomes.length === 0,
  );
  if (zeroCLOCourses.length) {
    console.error(
      '❌ Invariant failed: some courses have 0 CLOs after filter',
      zeroCLOCourses.slice(0, 3),
    );
    process.exit(1);
  }

  return result;
}

type EmbeddingBatchResponse = {
  embeddings: number[][];
};

/** ───────── main ───────── */
async function main() {
  const rows = await loadCsv();
  const combined = combineSameCourse(rows);

  // Preview
  const top = combined.slice(0, 5).map((c) => ({
    subjectCode: c.subjectCode,
    year: c.academicYear,
    campus: c.campusCode,
    faculty: c.facultyCode,
    semester: c.semester, // single semester
    cloCount: c.courseLearningOutcomes.length,
  }));
  console.log('📊 First 5 course summaries:', JSON.stringify(top, null, 2));

  const sliceCourses = combined.slice(0, 300); // limit for dev
  console.log(`⚙️  Seeding ${sliceCourses.length} courses (dev limit)`);

  try {
    for (const course of sliceCourses) {
      const res = await fetch(
        'http://localhost:8000/api/v1/semantics/batch_embed',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: course.courseLearningOutcomes.map((clo) => clo.cloNameTh),
          }),
        },
      );

      if (!res.ok) {
        throw new Error(
          `Embedding API error: ${res.status} ${res.statusText} - ${await res.text()}`,
        );
      }
      const data = (await res.json()) as EmbeddingBatchResponse;

      await prisma.$transaction(async (tx) => {
        // Create/update course
        const updatedCourse = await tx.course.upsert({
          where: {
            unique_course: {
              campusCode: course.campusCode,
              facultyCode: course.facultyCode,
              academicYear: course.academicYear,
              subjectCode: course.subjectCode,
              semester: course.semester,
            },
          },
          create: {
            id: course.courseId,
            academicYear: course.academicYear,
            semester: course.semester,
            campusCode: course.campusCode,
            facultyCode: course.facultyCode,
            subjectCode: course.subjectCode,
            subjectNameTh: course.subjectNameTh,
          },
          update: {
            semester: course.semester,
            subjectNameTh: course.subjectNameTh,
          },
        });

        // Delete existing CLOs
        await tx.courseLearningOutcome.deleteMany({
          where: { courseId: updatedCourse.id },
        });

        // Create new CLOs
        for (const clo of course.courseLearningOutcomes) {
          const idx = course.courseLearningOutcomes.findIndex(
            (c) => c.cloId === clo.cloId,
          );
          if (idx === -1 || !data.embeddings[idx]) {
            throw new Error(
              `Invariant failed: missing embedding for CLO idx=${idx} cloId=${clo.cloId}`,
            );
          }

          const embeddingVector = `[${data.embeddings[idx].join(',')}]`;

          await tx.$executeRaw`
  INSERT INTO course_learning_outcomes
  (id, clo_no, clo_name_th, course_id, embedding, created_at, updated_at)
  VALUES (${clo.cloId}::uuid, ${clo.cloNo}, ${clo.cloNameTh}, ${updatedCourse.id}::uuid, ${embeddingVector}::vector, NOW(), NOW())
`;
        }
      });
      console.log(
        `✅ Seeded course: ${course.subjectCode} (${course.academicYear} S${course.semester}) with ${course.courseLearningOutcomes.length} CLOs`,
      );
    }
    console.log('🎉 Seed completed successfully.');
  } catch (e) {
    console.error('💥 Seed failed during DB operation:', e);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('💥 Seed failed:', e);
  process.exit(1);
});
