import { FileHelper } from './helpers/file.helper';
import { CleanCourseWithCLO } from './types/clean-course.type';

export class InspectorPipeline {
  /**
   * Ensures that every subject maintains consistent CLO definitions
   * for each academic year + semester pair. If any (subject, year, semester, CLO number)
   * combination has more than one unique CLO name, a conflict is logged.
   */
  static logCloConflictsByCourseAndTerm(courses: CleanCourseWithCLO[]): void {
    const keyToCloNames = new Map<string, Map<number, Set<string>>>();

    for (const course of courses) {
      const key = `${course.subject_code}::${course.academic_year}::${course.semester}`;
      if (!keyToCloNames.has(key)) {
        keyToCloNames.set(key, new Map<number, Set<string>>());
      }

      const cloNoToNames = keyToCloNames.get(key)!;
      if (!cloNoToNames.has(course.clo_no)) {
        cloNoToNames.set(course.clo_no, new Set<string>());
      }

      cloNoToNames.get(course.clo_no)!.add(course.clean_clo_name_th);
    }

    const conflicts: Array<{
      subjectCode: string;
      academicYear: number;
      semester: number;
      cloNo: number;
      cloNames: string[];
    }> = [];

    for (const [key, cloMap] of keyToCloNames.entries()) {
      for (const [cloNo, cloNames] of cloMap.entries()) {
        if (cloNames.size > 1) {
          const [subjectCode, year, semester] = key.split('::');
          conflicts.push({
            subjectCode,
            academicYear: Number(year),
            semester: Number(semester),
            cloNo,
            cloNames: Array.from(cloNames),
          });
        }
      }
    }

    if (conflicts.length === 0) {
      console.log(
        '[InspectorPipeline] No CLO conflicts detected across subject/year/semester pairs.',
      );
      return;
    }

    console.log(
      `[InspectorPipeline] Found ${conflicts.length} CLO conflicts across subject/year/semester pairs:`,
    );
    for (const conflict of conflicts) {
      console.log(
        `[InspectorPipeline][CLO_CONFLICT] subject=${conflict.subjectCode} year=${conflict.academicYear} semester=${conflict.semester} clo_no=${conflict.cloNo} names=${conflict.cloNames.join(
          ' | ',
        )}`,
      );
    }
  }

  static logCloConsistencyAcrossTerms(courses: CleanCourseWithCLO[]): void {
    const subjectToTerms = new Map<string, Map<string, CleanCourseWithCLO[]>>();

    for (const course of courses) {
      if (!subjectToTerms.has(course.subject_code)) {
        subjectToTerms.set(
          course.subject_code,
          new Map<string, CleanCourseWithCLO[]>(),
        );
      }

      const termKey = `${course.academic_year}-${course.semester}`;
      const termMap = subjectToTerms.get(course.subject_code)!;
      if (!termMap.has(termKey)) {
        termMap.set(termKey, []);
      }
      termMap.get(termKey)!.push(course);
    }

    const conflicts: Array<{
      subjectCode: string;
      baseTerm: string;
      compareTerm: string;
      differences: string[];
    }> = [];

    for (const [subjectCode, termMap] of subjectToTerms.entries()) {
      if (termMap.size <= 1) continue;

      const sortedTerms = Array.from(termMap.entries()).sort(([a], [b]) =>
        a.localeCompare(b),
      );

      const [baseTerm, baseCourses] = sortedTerms[0];
      const baseMap = this.buildCloMap(baseCourses);

      for (let i = 1; i < sortedTerms.length; i++) {
        const [compareTerm, compareCourses] = sortedTerms[i];
        const compareMap = this.buildCloMap(compareCourses);
        const differences = this.describeCloDifferences(
          baseMap,
          compareMap,
          baseTerm,
          compareTerm,
        );
        if (differences.length > 0) {
          conflicts.push({
            subjectCode,
            baseTerm,
            compareTerm,
            differences,
          });
        }
      }
    }

    if (conflicts.length === 0) {
      console.log(
        '[InspectorPipeline] All terms contain matching CLO definitions per subject.',
      );
      return;
    }

    console.log(
      `[InspectorPipeline] Found ${conflicts.length} cross-term CLO mismatches:`,
    );
    for (const conflict of conflicts) {
      console.log(
        `[InspectorPipeline][CLO_TERM_MISMATCH] subject=${conflict.subjectCode} baseTerm=${conflict.baseTerm} compareTerm=${conflict.compareTerm}\n  - ${conflict.differences.join(
          '\n  - ',
        )}`,
      );
    }
  }

  private static buildCloMap(
    courses: CleanCourseWithCLO[],
  ): Map<number, string> {
    const map = new Map<number, string>();
    for (const course of courses) {
      map.set(course.clo_no, course.clean_clo_name_th);
    }
    return map;
  }

  private static describeCloDifferences(
    baseMap: Map<number, string>,
    compareMap: Map<number, string>,
    baseTerm: string,
    compareTerm: string,
  ): string[] {
    const differences: string[] = [];
    const allCloNos = new Set([...baseMap.keys(), ...compareMap.keys()]);

    for (const cloNo of allCloNos) {
      const baseName = baseMap.get(cloNo);
      const compareName = compareMap.get(cloNo);

      if (baseName && !compareName) {
        differences.push(
          `Missing CLO #${cloNo} in term ${compareTerm} (present in ${baseTerm} as "${baseName}")`,
        );
        continue;
      }

      if (!baseName && compareName) {
        differences.push(
          `Extra CLO #${cloNo} in term ${compareTerm} ("${compareName}") not found in ${baseTerm}`,
        );
        continue;
      }

      if (baseName && compareName && baseName !== compareName) {
        differences.push(
          `CLO #${cloNo} name mismatch: "${baseName}" (${baseTerm}) vs "${compareName}" (${compareTerm})`,
        );
      }
    }

    if (differences.length === 0 && baseMap.size !== compareMap.size) {
      differences.push(
        `CLO count mismatch between ${baseTerm} (${baseMap.size}) and ${compareTerm} (${compareMap.size})`,
      );
    }

    return differences;
  }

  static logCourseLocationConsistency(courses: CleanCourseWithCLO[]): void {
    const subjectToCampuses = new Map<string, Set<string>>();
    const subjectToFaculties = new Map<string, Set<string>>();

    for (const course of courses) {
      if (!subjectToCampuses.has(course.subject_code)) {
        subjectToCampuses.set(course.subject_code, new Set<string>());
        subjectToFaculties.set(course.subject_code, new Set<string>());
      }

      subjectToCampuses.get(course.subject_code)!.add(course.campus_code);
      subjectToFaculties.get(course.subject_code)!.add(course.faculty_code);
    }

    const conflicts: string[] = [];

    for (const [subjectCode, campuses] of subjectToCampuses.entries()) {
      const faculties = subjectToFaculties.get(subjectCode)!;
      if (campuses.size > 1) {
        conflicts.push(
          `[InspectorPipeline][COURSE_LOCATION] subject=${subjectCode} has multiple campus codes: ${Array.from(
            campuses,
          ).join(', ')}`,
        );
      }
      if (faculties.size > 1) {
        conflicts.push(
          `[InspectorPipeline][COURSE_LOCATION] subject=${subjectCode} has multiple faculty codes: ${Array.from(
            faculties,
          ).join(', ')}`,
        );
      }
    }

    if (conflicts.length === 0) {
      console.log(
        '[InspectorPipeline] All subject codes map to a single campus and faculty.',
      );
      return;
    }

    console.log(
      `[InspectorPipeline] Found ${conflicts.length} subject-to-campus/faculty mismatches:`,
    );
    for (const conflict of conflicts) {
      console.log(conflict);
    }
  }

  static async inspectValidCoursesData(): Promise<void> {
    const cleanedData = await FileHelper.loadLatestJson<CleanCourseWithCLO[]>(
      'src/modules/course/pipelines/data/cleaned/clean_courses_with_clo',
    );

    console.log(
      '[InspectorPipeline] Starting inspection of cleaned courses data...',
    );
    console.log(`Total cleaned courses loaded: ${cleanedData.length}`);

    this.logCloConflictsByCourseAndTerm(cleanedData);
    this.logCloConsistencyAcrossTerms(cleanedData);
    this.logCourseLocationConsistency(cleanedData);

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
    // const courseCodeToCampusCode = new Map<string, Set<string>>();
    // const courseCodeToFacultyCode = new Map<string, Set<string>>();

    // for (const course of cleanedData) {
    //   const subjectCode = course.subject_code;

    //   if (!courseCodeToCampusCode.has(subjectCode)) {
    //     courseCodeToCampusCode.set(subjectCode, new Set<string>());
    //   }
    //   courseCodeToCampusCode.get(subjectCode)!.add(course.campus_code);

    //   if (!courseCodeToFacultyCode.has(subjectCode)) {
    //     courseCodeToFacultyCode.set(subjectCode, new Set<string>());
    //   }
    //   courseCodeToFacultyCode.get(subjectCode)!.add(course.faculty_code);
    // }

    // // check for 1 course code but different campus_code
    // for (const [subjectCode, campusCodes] of courseCodeToCampusCode) {
    //   if (campusCodes.size > 1) {
    //     console.log(
    //       `Course code ${subjectCode} is associated with multiple campus codes: ${Array.from(
    //         campusCodes,
    //       ).join(', ')}`,
    //     );
    //   }
    // }

    // // check for 1 course code but different faculty_code
    // for (const [subjectCode, facultyCodes] of courseCodeToFacultyCode) {
    //   if (facultyCodes.size > 1) {
    //     console.log(
    //       `Course code ${subjectCode} is associated with multiple faculty codes: ${Array.from(
    //         facultyCodes,
    //       ).join(', ')}`,
    //     );
    //   }
    // }

    // console.log(
    //   `Inspection completed on ${cleanedData.length} cleaned courses.`,
    // );

    // // check code per name
    // const codeToName = new Map<string, string>();
    // for (const course of cleanedData) {
    //   const subjectName = course.subject_name_th;
    //   if (!codeToName.has(course.subject_code)) {
    //     codeToName.set(course.subject_code, subjectName);
    //   } else {
    //     const existingName = codeToName.get(course.subject_code)!;
    //     if (existingName !== subjectName) {
    //       console.log(
    //         `Conflict for code ${course.subject_code}: "${existingName}" vs "${subjectName}"`,
    //       );
    //     }
    //   }
    // }

    // // check for course code with same lo names regardless of year/semester
    // const codeToYearToSemesterToLoNamesMap = new Map<
    //   string,
    //   Map<string, Map<string, Set<string>>>
    // >();

    // for (const course of cleanedData) {
    //   const subjectCode = course.subject_code;
    //   const year = course.academic_year.toString();
    //   const semester = course.semester.toString();
    //   if (!codeToYearToSemesterToLoNamesMap.has(subjectCode)) {
    //     codeToYearToSemesterToLoNamesMap.set(
    //       subjectCode,
    //       new Map<string, Map<string, Set<string>>>(),
    //     );
    //   }
    //   const yearToSemesterMap =
    //     codeToYearToSemesterToLoNamesMap.get(subjectCode)!;
    //   if (!yearToSemesterMap.has(year)) {
    //     yearToSemesterMap.set(year, new Map<string, Set<string>>());
    //   }
    //   const semesterToLoNamesMap = yearToSemesterMap.get(year)!;
    //   if (!semesterToLoNamesMap.has(semester)) {
    //     semesterToLoNamesMap.set(semester, new Set<string>());
    //   }
    //   const loNamesSet = semesterToLoNamesMap.get(semester)!;
    //   loNamesSet.add(course.clean_clo_name_th);
    // }

    // // Check for courses with same CLO name but different CLO numbers across years/semesters
    // const codeToYearToSemesterToCloNameToNumbersMap = new Map<
    //   string,
    //   Map<string, Map<string, Map<string, Set<number>>>>
    // >();

    // for (const course of cleanedData) {
    //   const subjectCode = course.subject_code;
    //   const year = course.academic_year.toString();
    //   const semester = course.semester.toString();
    //   const cloName = course.clean_clo_name_th;
    //   const cloNumber = course.clo_no;

    //   if (!codeToYearToSemesterToCloNameToNumbersMap.has(subjectCode)) {
    //     codeToYearToSemesterToCloNameToNumbersMap.set(
    //       subjectCode,
    //       new Map<string, Map<string, Map<string, Set<number>>>>(),
    //     );
    //   }
    //   const yearToSemesterMap =
    //     codeToYearToSemesterToCloNameToNumbersMap.get(subjectCode)!;

    //   if (!yearToSemesterMap.has(year)) {
    //     yearToSemesterMap.set(
    //       year,
    //       new Map<string, Map<string, Set<number>>>(),
    //     );
    //   }
    //   const semesterToCloNameMap = yearToSemesterMap.get(year)!;

    //   if (!semesterToCloNameMap.has(semester)) {
    //     semesterToCloNameMap.set(semester, new Map<string, Set<number>>());
    //   }
    //   const cloNameToNumbersMap = semesterToCloNameMap.get(semester)!;

    //   if (!cloNameToNumbersMap.has(cloName)) {
    //     cloNameToNumbersMap.set(cloName, new Set<number>());
    //   }
    //   cloNameToNumbersMap.get(cloName)!.add(cloNumber);
    // }

    // // Log conflicts where same CLO name has different numbers, grouped by year and semester
    // for (const [
    //   subjectCode,
    //   yearToSemesterMap,
    // ] of codeToYearToSemesterToCloNameToNumbersMap.entries()) {
    //   for (const [year, semesterToCloNameMap] of yearToSemesterMap.entries()) {
    //     for (const [
    //       semester,
    //       cloNameToNumbersMap,
    //     ] of semesterToCloNameMap.entries()) {
    //       for (const [cloName, cloNumbers] of cloNameToNumbersMap.entries()) {
    //         if (cloNumbers.size > 1) {
    //           console.log(
    //             `Course code ${subjectCode} in year ${year} semester ${semester} has CLO name "${cloName}" with multiple numbers: ${Array.from(cloNumbers).sort().join(', ')}`,
    //           );
    //         }
    //       }

    //       // Check for consistent CLO sets across all years/semesters for each course
    //       const codeToAllCloNamesMap = new Map<string, Set<string>>();
    //       const codeToYearSemesterToCloNamesMap = new Map<
    //         string,
    //         Map<string, Set<string>>
    //       >();

    //       // First, collect all unique CLO names for each course code
    //       for (const course of cleanedData) {
    //         const subjectCode = course.subject_code;
    //         const cloName = course.clean_clo_name_th;

    //         if (!codeToAllCloNamesMap.has(subjectCode)) {
    //           codeToAllCloNamesMap.set(subjectCode, new Set<string>());
    //         }
    //         codeToAllCloNamesMap.get(subjectCode)!.add(cloName);
    //       }

    //       // Then, collect CLO names by year/semester for each course code
    //       for (const course of cleanedData) {
    //         const subjectCode = course.subject_code;
    //         const year = course.academic_year.toString();
    //         const semester = course.semester.toString();
    //         const yearSemesterKey = `${year}-${semester}`;
    //         const cloName = course.clean_clo_name_th;

    //         if (!codeToYearSemesterToCloNamesMap.has(subjectCode)) {
    //           codeToYearSemesterToCloNamesMap.set(
    //             subjectCode,
    //             new Map<string, Set<string>>(),
    //           );
    //         }
    //         const yearSemesterMap =
    //           codeToYearSemesterToCloNamesMap.get(subjectCode)!;

    //         if (!yearSemesterMap.has(yearSemesterKey)) {
    //           yearSemesterMap.set(yearSemesterKey, new Set<string>());
    //         }
    //         yearSemesterMap.get(yearSemesterKey)!.add(cloName);
    //       }

    //       // Check for inconsistencies
    //       for (const [
    //         subjectCode,
    //         allCloNames,
    //       ] of codeToAllCloNamesMap.entries()) {
    //         const yearSemesterMap =
    //           codeToYearSemesterToCloNamesMap.get(subjectCode);
    //         if (!yearSemesterMap) continue;

    //         for (const [
    //           yearSemesterKey,
    //           cloNames,
    //         ] of yearSemesterMap.entries()) {
    //           // Check size difference
    //           if (cloNames.size !== allCloNames.size) {
    //             console.log(
    //               `Course code ${subjectCode} in ${yearSemesterKey} has ${cloNames.size} CLOs, but expected ${allCloNames.size} CLOs based on all years/semesters`,
    //             );
    //           }

    //           // Check for missing CLO names
    //           const missingCloNames = Array.from(allCloNames).filter(
    //             (name) => !cloNames.has(name),
    //           );
    //           if (missingCloNames.length > 0) {
    //             console.log(
    //               `Course code ${subjectCode} in ${yearSemesterKey} is missing CLOs: ${missingCloNames.join(', ')}`,
    //             );
    //           }

    //           // Check for extra CLO names
    //           const extraCloNames = Array.from(cloNames).filter(
    //             (name) => !allCloNames.has(name),
    //           );
    //           if (extraCloNames.length > 0) {
    //             console.log(
    //               `Course code ${subjectCode} in ${yearSemesterKey} has extra CLOs: ${extraCloNames.join(', ')}`,
    //             );
    //           }
    //         }
    //       }
    //     }
    //   }
    // }

    // check 1 code only tied to 1 faculty/campus
    // const courseCodeToCampusSet = new Map<string, Set<string>>();
    // const courseCodeToFacultySet = new Map<string, Set<string>>();

    // for (const course of cleanedData) {
    //   const subjectCode = course.subject_code;

    //   if (!courseCodeToCampusSet.has(subjectCode)) {
    //     courseCodeToCampusSet.set(subjectCode, new Set<string>());
    //   }
    //   courseCodeToCampusSet.get(subjectCode)!.add(course.campus_code);

    //   if (!courseCodeToFacultySet.has(subjectCode)) {
    //     courseCodeToFacultySet.set(subjectCode, new Set<string>());
    //   }
    //   courseCodeToFacultySet.get(subjectCode)!.add(course.faculty_code);
    // }

    // for (const [subjectCode, campusSet] of courseCodeToCampusSet) {
    //   if (campusSet.size > 1) {
    //     console.log(
    //       `Course code ${subjectCode} is associated with multiple campus codes: ${Array.from(
    //         campusSet,
    //       ).join(', ')}`,
    //     );
    //   }
    // }

    // for (const [subjectCode, facultySet] of courseCodeToFacultySet) {
    //   if (facultySet.size > 1) {
    //     console.log(
    //       `Course code ${subjectCode} is associated with multiple faculty codes: ${Array.from(
    //         facultySet,
    //       ).join(', ')}`,
    //     );
    //   }
    // }
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

if (require.main === module) {
  runInspectorPipeline()
    .then(() => {
      console.log('Inspection completed successfully.');
    })
    .catch((error) => {
      console.error('Error during inspection pipeline:', error);
    });
}

// bunx ts-node --require tsconfig-paths/register src/modules/course/pipelines/inspector.ts
