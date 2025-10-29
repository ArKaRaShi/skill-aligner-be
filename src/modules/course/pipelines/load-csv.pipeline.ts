import { FileHelper } from './helpers/file.helper';
import {
  RawCourseWithCLOCsvRow,
  RawCourseWithCLOJsonRow,
} from './types/raw-course-row.type';

export class LoadCsvPipeline {
  private static readonly CSV_FILE_PATH = 'data/courses.csv';

  static async execute(
    filePath = this.CSV_FILE_PATH,
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
}

function inspectData(data: RawCourseWithCLOJsonRow[]) {
  let countEmptyCLO = 0;
  let countEmptySubjectName = 0;

  for (const row of data) {
    if (row.clo_name_th.trim() === '') {
      console.log('Found empty CLO name in row:', row);
      countEmptyCLO++;
    }
    if (row.subject_name_th.trim() === '') {
      console.log('Found empty subject name in row:', row);
      countEmptySubjectName++;
    }
  }

  console.log(`Found ${countEmptyCLO} rows with empty CLO names.`);
  console.log(`Found ${countEmptySubjectName} rows with empty subject names.`);
}

async function runPipeline() {
  const data = await LoadCsvPipeline.execute();
  //   await FileHelper.saveLatestJson<RawCourseWithCLOJsonRow[]>(
  //     'src/modules/course/pipelines/data/raw/courses',
  //     data,
  //   );
  inspectData(data);

  console.log('CSV data loaded and saved as JSON successfully.');
}

runPipeline()
  .then(() => {
    console.log('Pipeline completed successfully.');
  })
  .catch((err) => {
    console.error('Error running pipeline:', err);
  });

// bunx ts-node --require tsconfig-paths/register src/modules/course/pipelines/load-csv.pipeline.ts
