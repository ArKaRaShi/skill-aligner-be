import { FileHelper } from './helpers/file.helper';
import { CleanCourseWithCLO } from './types/clean-course.type';

export class InspectorPipeline {
  static async inspectValidCoursesData(): Promise<void> {
    const cleanedData = await FileHelper.loadLatestJson<CleanCourseWithCLO[]>(
      'src/modules/course/pipelines/data/cleaned/clean_courses_with_clo',
    );

    const byAcademicYearSemesterAndSubjectCode =
      this.groupByAcademicYearSemesterAndSubjectCode(cleanedData);
    console.log(
      `Total unique (academic year, semester, subject code) combinations: ${byAcademicYearSemesterAndSubjectCode.size}`,
    );

    const byAllMetadata = this.groupByAllMetadata(cleanedData);
    console.log(
      `Total unique (academic year, semester, campus code, faculty code, subject code) combinations: ${byAllMetadata.size}`,
    );
  }

  static groupByAcademicYearSemesterAndSubjectCode(
    courses: CleanCourseWithCLO[],
  ): Map<string, CleanCourseWithCLO[]> {
    const groupedMap = new Map<string, CleanCourseWithCLO[]>();
    for (const course of courses) {
      const key = `${course.academic_year}-${course.semester}-${course.subject_code}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)?.push(course);
    }
    return groupedMap;
  }

  static groupByAllMetadata(
    courses: CleanCourseWithCLO[],
  ): Map<string, CleanCourseWithCLO[]> {
    const groupedMap = new Map<string, CleanCourseWithCLO[]>();
    for (const course of courses) {
      const key = `${course.academic_year}-${course.semester}-${course.campus_code}-${course.faculty_code}-${course.subject_code}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)?.push(course);
    }
    return groupedMap;
  }

  static isOnlyContainEnglish(text: string): boolean {
    const englishRegex = /^[A-Za-z\s]+$/;
    return englishRegex.test(text);
  }

  static isContainEnglishParentheses(text: string): boolean {
    const englishParenthesesRegex = /\([A-Za-z\s]+\)/;
    return englishParenthesesRegex.test(text);
  }
}

async function runInspectorPipeline() {
  await InspectorPipeline.inspectValidCoursesData();
}

runInspectorPipeline()
  .then(() => {
    console.log('Inspection completed successfully.');
  })
  .catch((error) => {
    console.error('Error during inspection pipeline:', error);
  });

// bunx ts-node --require tsconfig-paths/register src/modules/course/pipelines/inspector.ts
