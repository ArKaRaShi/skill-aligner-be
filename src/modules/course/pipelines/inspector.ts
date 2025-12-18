import { FileHelper } from './helpers/file.helper';
import { CleanCourseWithCLO } from './types/clean-course.type';

export class InspectorPipeline {
  static async inspectValidCoursesData(): Promise<void> {
    const cleanedData = await FileHelper.loadLatestJson<CleanCourseWithCLO[]>(
      'src/modules/course/pipelines/data/cleaned/clean_courses_with_clo',
    );

    // const originalCloNameCheck = new Map<string, Set<string>>();
    // for (const course of cleanedData) {
    //   const key = `${course.academic_year}-${course.semester}-${course.subject_code}`;
    //   if (!originalCloNameCheck.has(key)) {
    //     originalCloNameCheck.set(key, new Set<string>());
    //   }
    //   const cloNamesSet = originalCloNameCheck.get(key)!;
    //   if (cloNamesSet.has(course.original_clo_name_th)) {
    //     console.log(
    //       `Duplicate CLO name found for course ${key}: "${course.original_clo_name_th}"`,
    //     );
    //   } else {
    //     cloNamesSet.add(course.original_clo_name_th);
    //   }
    // }

    // Check for 2-character university code conflicts
    // const campusCodeToSubjectCodesMap = new Map<string, Set<string>>();
    // for (const course of cleanedData) {
    //   const subjectCode = course.subject_code;
    //   const sliceCode = subjectCode.slice(0, 2); // 2 characters for university code

    //   if (!campusCodeToSubjectCodesMap.has(course.campus_code)) {
    //     campusCodeToSubjectCodesMap.set(course.campus_code, new Set<string>());
    //   }
    //   campusCodeToSubjectCodesMap.get(course.campus_code)!.add(sliceCode);
    // }
    // for (const [campusCode, subjectCodes] of campusCodeToSubjectCodesMap) {
    //   console.log(
    //     'For campus code',
    //     campusCode,
    //     'found subject codes:',
    //     Array.from(subjectCodes).join(', '),
    //   );
    // }

    // for (const course of cleanedData) {
    //   if (course.campus_code === 'K' && course.subject_code.startsWith('01')) {
    //     console.log(
    //       `Potential conflict for course with subject code ${course.subject_code} under campus code K`,
    //     );
    //   }
    // }
    // for (const course of cleanedData) {
    //   if (course.campus_code === 'B' && course.subject_code === '01420334-66') {
    //     console.log(
    //       `Found specific course with subject code ${course.subject_code} under campus code B`,
    //     );
    //   }
    // }

    // check for 1 course code but different campus_code/faculty_code
    const courseCodeToCampusCode = new Map<string, Set<string>>();
    const courseCodeToFacultyCode = new Map<string, Set<string>>();

    for (const course of cleanedData) {
      const subjectCode = course.subject_code;

      if (!courseCodeToCampusCode.has(subjectCode)) {
        courseCodeToCampusCode.set(subjectCode, new Set<string>());
      }
      courseCodeToCampusCode.get(subjectCode)!.add(course.campus_code);

      if (!courseCodeToFacultyCode.has(subjectCode)) {
        courseCodeToFacultyCode.set(subjectCode, new Set<string>());
      }
      courseCodeToFacultyCode.get(subjectCode)!.add(course.faculty_code);
    }

    // check for 1 course code but different campus_code
    for (const [subjectCode, campusCodes] of courseCodeToCampusCode) {
      if (campusCodes.size > 1) {
        console.log(
          `Course code ${subjectCode} is associated with multiple campus codes: ${Array.from(
            campusCodes,
          ).join(', ')}`,
        );
      }
    }

    // check for 1 course code but different faculty_code
    for (const [subjectCode, facultyCodes] of courseCodeToFacultyCode) {
      if (facultyCodes.size > 1) {
        console.log(
          `Course code ${subjectCode} is associated with multiple faculty codes: ${Array.from(
            facultyCodes,
          ).join(', ')}`,
        );
      }
    }

    console.log(
      `Inspection completed on ${cleanedData.length} cleaned courses.`,
    );

    // check code per name
    const codeToName = new Map<string, string>();
    for (const course of cleanedData) {
      const subjectName = course.subject_name_th;
      if (!codeToName.has(course.subject_code)) {
        codeToName.set(course.subject_code, subjectName);
      } else {
        const existingName = codeToName.get(course.subject_code)!;
        if (existingName !== subjectName) {
          console.log(
            `Conflict for code ${course.subject_code}: "${existingName}" vs "${subjectName}"`,
          );
        }
      }
    }
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
