import { FileHelper } from './helpers/file.helper';
import { CleanCourseWithCLO } from './types/clean-course.type';
import { RawCourseWithCLOJsonRow } from './types/raw-course-row.type';

export class CleanNormalizeCLOPipeline {
  private static readonly RAW_DATA_PATH =
    'src/modules/course/pipelines/data/raw/courses';

  private static readonly AMBIGUOUS_CLO_LENGTH_THRESHOLD = 15;

  static async execute(): Promise<CleanCourseWithCLO[]> {
    const rawData = await FileHelper.loadLatestJson<RawCourseWithCLOJsonRow[]>(
      this.RAW_DATA_PATH,
    );

    const cleanedData: CleanCourseWithCLO[] = rawData.map((row) =>
      this.cleanRow(row),
    );

    return cleanedData;
  }

  private static cleanRow(row: RawCourseWithCLOJsonRow): CleanCourseWithCLO {
    const cleanedRow: CleanCourseWithCLO = {
      academic_year: row.academic_year,
      semester: row.semester,
      campus_code: row.campus_code,
      faculty_code: row.faculty_code,
      subject_code: row.subject_code,
      subject_name_th: row.subject_name_th,
      clo_no: row.clo_no,
      original_clo_name_th: row.clo_name_th,
      skipEmbedding: false,
      clean_clo_name_th: '', // to be filled after processing
      keywords: [], // to be filled in future enhancement
    };

    const { clo_name_th } = row;

    // Determine if the CLO should be skipped based on initial checks
    if (
      (this.isEmptyOrWhitespace(clo_name_th) ||
        this.containsSequentialCLONumbers(clo_name_th) ||
        this.onlyDash(clo_name_th) ||
        this.lengthSeemsAmbiguous(clo_name_th)) &&
      !this.explicitAllowCLOName(clo_name_th)
    ) {
      cleanedRow.skipEmbedding = true;
    }

    // remove in order: leading numbers, "CLO" prefixes, "นิสิต", English parentheses
    const preNormalizedCloName = this.preNormalizeCLOName(clo_name_th);
    const withoutNewlines = this.removeNewlines(preNormalizedCloName);
    const withoutLeadingNumbers = this.removeLeadingNumbers(withoutNewlines);
    const withoutCLOPrefix = this.removeLeadingCLOPrefix(withoutLeadingNumbers);
    const cleanedCLOName = this.removeLeadingNisit(withoutCLOPrefix);
    const {
      cleanedCloName: withoutEnglishText,
      extractedParentheses: keywords,
    } = this.extractEnglishParentheses(cleanedCLOName);

    cleanedRow.clean_clo_name_th = withoutEnglishText;
    cleanedRow.keywords = keywords;

    return cleanedRow;
  }

  private static explicitAllowCLOName(cloName: string): boolean {
    const allowList = ['ทำงานเป็นทีม'];

    return allowList.includes(cloName.trim());
  }

  private static preNormalizeCLOName(cloName: string): string {
    const lowerCased = cloName.toLowerCase();
    const removedLeftAndRightSpaces = lowerCased.trim();
    return removedLeftAndRightSpaces;
  }

  /**
   * Remove leading numbers and punctuation from CLO name.
   * @param cloName - The CLO name to process.
   * @returns The processed CLO name without leading numbers and punctuation.
   *
   * @example
   * removeLeadingNumbers("1. อธิบายเกี่ยวกับการย่อยสลายและการสังเคราะห์สารต่าง ๆ ในสิ่งมีชีวิตได้") => "อธิบายเกี่ยวกับการย่อยสลายและการสังเคราะห์สารต่าง ๆ ในสิ่งมีชีวิตได้"
   */
  private static removeLeadingNumbers(cloName: string): string {
    return cloName.replace(/^\d+(?:[.)-]\d+)*(?:[.)\s-])*/, '').trim();
  }

  /**
   * Remove leading "CLO" prefixes from CLO name.
   * @param cloName - The CLO name to process.
   * @returns The processed CLO name without leading "CLO" prefixes.
   * @example
   * removeLeadingCLOPrefix("CLO2: วิเคราะห์และประเมินผลการดำเนินงานทางธุรกิจได้") => "วิเคราะห์และประเมินผลการดำเนินงานทางธุรกิจได้"
   */
  private static removeLeadingCLOPrefix(cloName: string): string {
    return cloName.replace(/^clo\s*\d+[:.\s-]*/i, '').trim();
  }

  /**
   * Remove newlines from CLO name.
   * @param cloName - The CLO name to process.
   * @returns The processed CLO name without newlines.
   * @example
   * removeNewlines("อธิบายความสำคัญของอุตสาหกรรม\nสีเขียวได้") => "อธิบายความสำคัญของอุตสาหกรรม สีเขียวได้"
   */
  private static removeNewlines(cloName: string): string {
    return cloName.replaceAll(/[\r\n]+/g, ' ').trim();
  }

  /**
   * Remove leading "นิสิต" from CLO name.
   * @param cloName - The CLO name to process.
   * @returns The processed CLO name without leading "นิสิต" prefixes.
   * @example
   * removeLeadingNisit("นิสิตอธิบายความสำคัญของอุตสาหกรรมสีเขียวได้") => "อธิบายความสำคัญของอุตสาหกรรมสีเขียวได้"
   */
  private static removeLeadingNisit(cloName: string): string {
    return cloName.replace(/^นิสิต[:.\s-]*/i, '').trim();
  }

  /**
   * Check if the CLO name contains sequential CLO numbers.
   * @param cloName - The CLO name to process.
   * @returns True if the CLO name contains sequential CLO numbers, false otherwise.
   */
  private static containsSequentialCLONumbers(cloName: string): boolean {
    const sequentialPattern = /^(clo\s*)?(\d+[\s,.-]*)+$/i;
    return sequentialPattern.test(cloName);
  }

  // /**
  //  * Remove English text within parentheses from CLO name.
  //  * @param cloName - The CLO name to process.
  //  * @returns The processed CLO name without English text in parentheses.
  //  */
  // private static removeEnglishParentheses(cloName: string): string {
  //   return cloName.replaceAll(/\([a-zA-Z\s]+\)/g, '').trim();
  // }

  /**
   * Separates English text in parentheses from a CLO name.
   * Only extracts letters, numbers, spaces, and common symbols inside parentheses.
   * @param cloName - The CLO name to process.
   * @returns An object with the cleaned CLO name and the extracted parenthetical texts.
   * @example
   * extractEnglishParentheses("วิเคราะห์ข้อมูล (Analyze Data) ได้")
   * => { cleanedCloName: "วิเคราะห์ข้อมูล ได้", extractedParentheses: ["Analyze Data"] }
   */
  private static extractEnglishParentheses(cloName: string): {
    cleanedCloName: string;
    extractedParentheses: string[];
  } {
    // Match parentheses containing mostly English letters, numbers, spaces, commas, dashes
    const regex = /\(([a-zA-Z0-9\s,.-]+)\)/g;
    const matches = Array.from(cloName.matchAll(regex), (m) => m[1]);

    const cleanedCloName = cloName
      .replaceAll(regex, '')
      .replaceAll(/\s+/g, ' ')
      .trim();

    return {
      cleanedCloName,
      extractedParentheses: matches,
    };
  }
  /**
   * Check if the CLO name is just a dash ("-").
   * @param cloName - The CLO name to process.
   * @returns True if the CLO name is just a dash, false otherwise.
   */
  private static onlyDash(cloName: string): boolean {
    if (cloName.trim() === '-') {
      return true;
    }
    return false;
  }

  /**
   * Check if the text is empty or contains only whitespace.
   * @param text - The text to check.
   * @returns True if the text is empty or whitespace, false otherwise.
   */
  private static isEmptyOrWhitespace(text: string): boolean {
    return text.trim().length === 0;
  }

  /**
   * Check if the text length seems ambiguous based on a threshold.
   * @param text - The text to check.
   * @param threshold - The length threshold.
   * @returns True if the text length is below the threshold, false otherwise.
   */
  private static lengthSeemsAmbiguous(
    text: string,
    threshold: number = this.AMBIGUOUS_CLO_LENGTH_THRESHOLD,
  ): boolean {
    return text.length < threshold;
  }
}

async function runPipeline({ save = false }: { save?: boolean } = {}) {
  const cleanedData = await CleanNormalizeCLOPipeline.execute();
  const skippedData: CleanCourseWithCLO[] = cleanedData.filter(
    (row) => row.skipEmbedding,
  );

  if (save) {
    await FileHelper.saveLatestJson<CleanCourseWithCLO[]>(
      'src/modules/course/pipelines/data/cleaned/clean_courses_with_clo',
      cleanedData,
    );

    await FileHelper.saveLatestJson<CleanCourseWithCLO[]>(
      'src/modules/course/pipelines/data/cleaned/skipped_embedding_courses_with_clo',
      skippedData,
    );
  }

  console.log('CLO cleaning and normalization completed successfully.');
}

runPipeline({ save: true })
  .then(() => {
    console.log('Pipeline completed successfully.');
  })
  .catch((err) => {
    console.error('Error running pipeline:', err);
  });

// bunx ts-node --require tsconfig-paths/register src/modules/course/pipelines/clean-normalize-clo.pipeline.ts
