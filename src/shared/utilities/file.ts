import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';

export class FileHelper {
  /**
   * Reads a CSV file and parses its content into an array of objects of type T.
   * @param filePath - path to CSV file
   * @returns - parsed records as array of type T
   * @throws - if file reading or parsing fails
   * @example
   * const records = await FileHelper.readCSVFile<MyType>('data.csv');
   * console.log(records); // Array of MyType objects
   */
  static async readCSVFile<T>(filePath: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const records: T[] = [];
      fs.createReadStream(filePath)
        .pipe(parse({ columns: true, trim: true }))
        .on('data', (row: any) => records.push(row as T))
        .on('end', () => resolve(records))
        .on('error', reject);
    });
  }

  /**
   * Reads a JSON file and parses its content into an object of type T.
   * @param filePath - The path to the JSON file to read.
   * @returns - The parsed JSON object.
   */
  static async readJsonFile<T>(filePath: string): Promise<T> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  }

  /**
   * Writes a JSON file with the specified payload.
   * @param filePath - The path to the JSON file to write.
   * @param payload - The data to write to the JSON file.
   */
  static async writeJsonFile<TPayload>(
    filePath: string,
    payload: TPayload,
  ): Promise<void> {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(payload, null, 2),
      'utf8',
    );
  }

  /**
   * Ensures a unique file path by appending a numeric suffix if the file already exists.
   * @param filePath - The original file path.
   * @returns - A unique file path.
   */
  static async ensureUniqueFilePath(filePath: string): Promise<string> {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);

    const match = /^(.*?)(-(\d+))?$/.exec(baseName);
    const namePart = match?.[1] ?? baseName;
    let counter = match?.[3] ? Number.parseInt(match[3], 10) : 0;

    let candidatePath = filePath;

    // Loop until a non-existent file path is found or the original path is unused.
    // This helps avoid overwriting existing files by appending an incrementing suffix.
    // Example: report.json -> report-1.json -> report-2.json, etc.
    while (await FileHelper.fileExists(candidatePath)) {
      counter += 1;
      const incrementedName = `${namePart}-${counter}${ext}`;
      candidatePath = path.join(dir, incrementedName);
    }

    return candidatePath;
  }

  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
