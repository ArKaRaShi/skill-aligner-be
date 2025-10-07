import { parse } from 'csv-parse';
import * as fs from 'fs';

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
}
