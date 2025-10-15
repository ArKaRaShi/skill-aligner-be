import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { Identifier } from 'src/common/domain/types/identifier';
import { FileHelper } from 'src/common/helpers/file';

import {
  CsvRow,
  CsvRowSchema,
  EmbeddedCoursesSnapshotSchema,
} from './course.schemas';
import {
  Course,
  EmbeddedCourse,
  EmbeddedCoursesSnapshot,
} from './course.types';

export class CourseFileLoader {
  private static resolveCsvPath(): string {
    return path.resolve(process.cwd(), 'data/courses.csv');
  }

  private static resolveEmbeddedJsonPath(filePath: string): string {
    return path.resolve(process.cwd(), filePath);
  }

  static async loadCsv(): Promise<CsvRow[]> {
    const filePath = this.resolveCsvPath();
    console.log(`📄 Reading CSV from: ${filePath}`);

    let raw: unknown[];
    try {
      raw = await FileHelper.readCSVFile<unknown>(filePath);
    } catch (error) {
      console.error('💥 Failed to read CSV:', error);
      throw error;
    }

    const parsed: CsvRow[] = [];
    const errors: Array<{ index: number; issues: string[]; sample: any }> = [];

    raw.forEach((row, index) => {
      const result = CsvRowSchema.safeParse(row);
      if (result.success) parsed.push(result.data);
      else {
        const issues = result.error.issues.map(
          (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        );
        errors.push({ index: index + 1, issues, sample: row });
      }
    });

    console.log(
      `✅ Loaded ${raw.length} rows, valid: ${parsed.length}, invalid: ${errors.length}`,
    );
    if (errors.length) {
      console.warn('⚠️  First 3 validation errors:');
      errors.slice(0, 3).forEach((error, position) => {
        console.warn(
          `  #${position + 1} row=${error.index}\n    issues: ${error.issues.join(' | ')}\n    sample: ${JSON.stringify(
            error.sample,
          )}`,
        );
      });
    }

    return parsed;
  }

  static combineSameCourse(records: CsvRow[]): Course[] {
    const byCourse = new Map<
      string,
      { course: Course; seenCLO: Set<string> }
    >();

    let createdCourses = 0;
    let dupCLOs = 0;

    for (const record of records) {
      const courseKey = [
        record.academic_year,
        record.subject_code,
        record.campus_code,
        record.faculty_code,
        record.semester,
      ].join('|');

      let bucket = byCourse.get(courseKey);
      if (!bucket) {
        const course: Course = {
          courseId: uuidv4() as Identifier,
          academicYear: record.academic_year,
          semester: record.semester,
          campusCode: record.campus_code,
          facultyCode: record.faculty_code,
          subjectCode: record.subject_code,
          subjectNameTh: record.subject_name_th,
          courseLearningOutcomes: [],
        };
        bucket = { course, seenCLO: new Set() };
        byCourse.set(courseKey, bucket);
        createdCourses++;
      }

      const cloNo = record.clo_no;
      const cloName = record.clo_name_th;

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

    const allCourses = Array.from(byCourse.values()).map((bucket) => {
      bucket.course.courseLearningOutcomes.sort((a, b) => a.cloNo - b.cloNo);
      return bucket.course;
    });

    const result = allCourses.filter(
      (course) => course.courseLearningOutcomes.length > 0,
    );
    const droppedCourses = allCourses.length - result.length;

    console.log('——— Combine summary ———');
    console.log(`🆕 Courses created (per semester): ${createdCourses}`);
    console.log(`🔁 Duplicate CLO rows ignored: ${dupCLOs}`);
    console.log(`🚫 Dropped courses (0 CLOs after combine): ${droppedCourses}`);
    console.log(`📦 Output courses: ${result.length}`);

    const zeroCLOCourses = result.filter(
      (course) => course.courseLearningOutcomes.length === 0,
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

  static async loadCourses(): Promise<Course[]> {
    const rows = await this.loadCsv();
    return this.combineSameCourse(rows);
  }

  static async loadEmbeddedSnapshot(
    filePath: string,
  ): Promise<EmbeddedCoursesSnapshot> {
    const resolvedFilePath = this.resolveEmbeddedJsonPath(filePath);
    console.log(`📄 Reading embedded courses from: ${resolvedFilePath}`);

    let raw: unknown;
    try {
      raw = await FileHelper.readJsonFile<unknown>(resolvedFilePath);
    } catch (error) {
      console.error('💥 Failed to read embedded courses JSON:', error);
      throw error;
    }

    const parsed = EmbeddedCoursesSnapshotSchema.parse(raw);
    const courses: EmbeddedCourse[] = parsed.courses.map((course) => ({
      ...course,
      courseId: course.courseId as Identifier,
      courseLearningOutcomes: course.courseLearningOutcomes.map((clo) => ({
        ...clo,
        cloId: clo.cloId as Identifier,
        courseId: clo.courseId as Identifier,
      })),
    }));

    return {
      metadata: parsed.metadata,
      courses,
    };
  }
}

/** Convenience wrappers for legacy call sites. */
export async function loadCsv(): Promise<CsvRow[]> {
  return CourseFileLoader.loadCsv();
}

export function combineSameCourse(records: CsvRow[]): Course[] {
  return CourseFileLoader.combineSameCourse(records);
}

export async function loadCourses(): Promise<Course[]> {
  return CourseFileLoader.loadCourses();
}

export type {
  Course,
  CourseLearningOutcome,
  EmbeddedCourse,
  EmbeddedCourseLearningOutcome,
  EmbeddedCoursesSnapshot,
} from './course.types';
export type { CsvRow } from './course.schemas';
