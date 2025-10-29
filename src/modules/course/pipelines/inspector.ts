import { FileHelper } from './helpers/file.helper';
import { CleanCourseWithCLO } from './types/clean-course.type';

export class InspectorPipeline {
  static async inspectValidCoursesData(): Promise<void> {
    const validData = await FileHelper.loadLatestJson<CleanCourseWithCLO[]>(
      'src/modules/course/pipelines/data/cleaned/valid_courses_with_clo',
    );
    const ambiguousData = await FileHelper.loadLatestJson<CleanCourseWithCLO[]>(
      'src/modules/course/pipelines/data/cleaned/ambiguous_courses_with_clo',
    );

    // const seenCLO = new Set<string>();
    // const duplicateCLOs = new Set<string>();

    // let count = 0;

    let countContainEnglish = 0;

    const validCourseNames = new Set<string>();
    for (const row of validData) {
      validCourseNames.add(row.subject_name_th);
      if (this.isOnlyContainEnglish(row.clean_clo_name_th)) {
        console.log(
          'Found valid CLO name containing English characters in row:',
          row,
        );
        countContainEnglish++;
      }
    }
    console.log(
      `Found ${countContainEnglish} valid CLO names containing English characters.`,
    );

    for (const row of ambiguousData) {
      if (validCourseNames.has(row.subject_name_th)) {
        console.log(
          'Found ambiguous CLO for course that has valid CLOs:',
          row.subject_name_th,
        );
      }

      //   const trimmedCLO = row.clo_name_th.trim();
      //   if (trimmedCLO.length > 15 && trimmedCLO.length < 50) {
      //     console.log(
      //       'Found suspiciously short CLO name in row:',
      //       row.clo_name_th,
      //     );
      //     countSuspiciousCLO++;
      //   }
      //   if (this.isContainEnglish(row.clo_name_th)) {
      //     console.log(
      //       'Found CLO name containing English characters in row:',
      //       row,
      //     );
      //     countSuspiciousCLO++;
      //   }
      //   if (this.isContainEnglishParentheses(row.clo_name_th)) {
      //     console.log('Found CLO name containing parentheses in row:', row);
      //     countSuspiciousCLO++;
      //   }
      //   if (row.keywords.length > 0) {
      //     console.log('Found CLO name containing keywords in row:', row);
      //     count++;
      //   }

      //   if (seenCLO.has(row.clean_clo_name_th)) {
      //     duplicateCLOs.add(row.clean_clo_name_th);
      //   } else {
      //     seenCLO.add(row.clean_clo_name_th);
      //   }
    }
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
