import { FileHelper } from 'src/shared/utils/file';

import {
  RawCourseWithCLOCsvRow,
  RawCourseWithCLOJsonRow,
} from './types/raw-course-row.type';
import { ProcessedGenEdRow } from './types/raw-gened-row.type';

export class LoadCsvPipeline {
  private static readonly COURSE_CSV_FILE_PATH = 'data/courses.csv';
  private static readonly GEN_ED_CSV_FILE_PATH = 'data/gened.csv';

  static async loadCourses(
    filePath = this.COURSE_CSV_FILE_PATH,
  ): Promise<RawCourseWithCLOJsonRow[]> {
    const rawRows = await FileHelper.loadCsv<RawCourseWithCLOCsvRow>(filePath);
    return rawRows.map((row) => ({
      academic_year: Number(row.academic_year),
      semester: Number(row.semester),
      campus_code: row.campus_code,
      faculty_code: row.faculty_code,
      subject_code: row.subject_code,
      subject_name_th: row.subject_name_th,
      clo_no: Number(row.clo_no),
      clo_name_th: row.clo_name_th,
    }));
  }

  static async loadGenEdCourses(
    filePath = this.GEN_ED_CSV_FILE_PATH,
  ): Promise<ProcessedGenEdRow[]> {
    const rawRows = await FileHelper.loadCsv<Record<string, string>>(filePath);

    return rawRows.map((row) => {
      const subject_code = row['รหัสวิชา'];
      const subject_name = row['ชื่อวิชา'];
      const credit = row['หน่วยกิต'];
      const faculty_code = row['คณะต้นสังกัด'];
      const learning_group_64 = row['กลุ่มสาระ - 64'];
      const competency_67 = row['สมรรถนะ - 67'];

      return {
        subject_code,
        subject_name,
        credit,
        faculty_code,
        learning_group_64,
        competency_67,
        has64: Boolean(
          learning_group_64 &&
            learning_group_64 !== '-' &&
            !learning_group_64.includes('--ปิดรายวิชา--'),
        ),
        has67: Boolean(
          competency_67 &&
            competency_67 !== '-' &&
            !competency_67.includes('--ปิดรายวิชา--'),
        ),
        is_course_closed: Boolean(
          (subject_name && subject_name.includes('--ปิดรายวิชา--')) ||
            (learning_group_64 &&
              learning_group_64.includes('--ปิดรายวิชา--')) ||
            (competency_67 && competency_67.includes('--ปิดรายวิชา--')),
        ),
      };
    });
  }
}

async function runPipeline({
  loadAndSaveCoursesCsvToJson,
  loadAndSaveGenEdCsvToJson,
}: {
  loadAndSaveCoursesCsvToJson: boolean;
  loadAndSaveGenEdCsvToJson: boolean;
}) {
  if (loadAndSaveGenEdCsvToJson) {
    const genEdData = await LoadCsvPipeline.loadGenEdCourses();
    await FileHelper.saveLatestJson<ProcessedGenEdRow[]>(
      'src/modules/course/pipelines/data/raw/gened_courses',
      genEdData,
    );
    console.log('CSV gen-ed data loaded and saved as JSON successfully.');
  }
  if (loadAndSaveCoursesCsvToJson) {
    const data = await LoadCsvPipeline.loadCourses();
    await FileHelper.saveLatestJson<RawCourseWithCLOJsonRow[]>(
      'src/modules/course/pipelines/data/raw/courses',
      data,
    );
    console.log('CSV course data loaded and saved as JSON successfully.');
  }
  // inspectData(data);
}

runPipeline({
  loadAndSaveCoursesCsvToJson: false,
  loadAndSaveGenEdCsvToJson: true,
})
  .then(() => {
    console.log('Pipeline completed successfully.');
  })
  .catch((err) => {
    console.error('Error running pipeline:', err);
  });

// bunx ts-node --require tsconfig-paths/register src/modules/course/pipelines/load-csv.pipeline.ts
