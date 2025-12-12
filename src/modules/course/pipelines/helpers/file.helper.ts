import { parse } from 'csv-parse';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class FileHelper {
  /**
   * Loads and parses a CSV file into type T
   * @param filePath - Full path from project root
   * @returns Promise of parsed records as array of type T
   * @throws Error if file doesn't exist or parsing fails
   */
  static async loadCsv<T>(filePath: string): Promise<T[]> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found at path: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      const records: T[] = [];

      fs.createReadStream(filePath)
        .pipe(parse({ columns: true, trim: true }))
        .on('data', (row: unknown) => records.push(row as T))
        .on('error', (error: Error) =>
          reject(new Error(`Failed to parse CSV: ${error.message}`)),
        )
        .on('end', () => resolve(records));
    });
  }

  /**
   * Loads and parses a JSON file into type T
   * @param filePath - Full path from project root
   * @returns Promise of parsed JSON as type T
   * @throws Error if file doesn't exist or parsing fails
   */
  static async loadJson<T>(filePath: string): Promise<T> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`JSON file not found at path: ${filePath}`);
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(
        `Failed to parse JSON: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Loads the latest versioned JSON file into type T
   * @param dirPath - Base directory path (e.g. 'data/raw_course')
   * @returns Promise of parsed JSON as type T
   * @throws Error if no valid files found or parsing fails
   */
  static async loadLatestJson<T>(dirPath: string): Promise<T> {
    // For a path like 'dir/data', we want to check if 'dir' exists
    // and look for files matching 'data-*.json' in 'dir'
    const baseDir = dirPath.includes(path.sep) ? path.dirname(dirPath) : '.';

    if (!fs.existsSync(baseDir)) {
      throw new Error(`Directory not found: ${baseDir}`);
    }

    const { latestFilePath, baseFile } = this.resolveNumberedJson(dirPath);

    if (!latestFilePath) {
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory not found: ${dirPath}`);
      }

      throw new Error(
        `No valid versioned JSON files found in ${baseDir} matching pattern ${baseFile}-*.json`,
      );
    }

    try {
      const content = await fs.promises.readFile(latestFilePath, 'utf8');
      return JSON.parse(content) as T;
    } catch {
      throw new Error(`Failed to read or parse JSON file: ${latestFilePath}`);
    }
  }

  /**
   * Saves data to a JSON file, creating directories if needed
   * @param filePath - Full path from project root
   * @param data - Data to save
   */
  static async saveJson<T>(filePath: string, data: T): Promise<void> {
    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf8',
      );
    } catch (error) {
      throw new Error(
        `Failed to save JSON: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Saves data to a versioned JSON file, incrementing version number
   * @param dirPath - Base directory path (e.g. 'data/raw_course')
   * @param data - Data to save
   * @returns Promise of the saved file path
   */
  static async saveLatestJson<T>(dirPath: string, data: T): Promise<string> {
    const { baseDir, nextFilePath } = this.resolveNumberedJson(dirPath);

    try {
      await fs.promises.mkdir(baseDir, { recursive: true });
      await fs.promises.writeFile(
        nextFilePath,
        JSON.stringify(data, null, 2),
        'utf8',
      );
      return nextFilePath;
    } catch (error) {
      throw new Error(
        `Failed to save latest JSON: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  static async appendToJsonArray<T>(filePath: string, data: T): Promise<void> {
    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

      let existingData: T[] = [];
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        if (content.trim().length > 0) {
          const parsed = JSON.parse(content);
          if (!Array.isArray(parsed)) {
            throw new Error(
              `JSON file at ${filePath} does not contain an array structure`,
            );
          }
          existingData = parsed as T[];
        }
      }

      existingData.push(data);

      await fs.promises.writeFile(
        filePath,
        JSON.stringify(existingData, null, 2),
        'utf8',
      );
    } catch (error) {
      throw new Error(
        `Failed to append to JSON array: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  static async listFiles(dirPath: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(dirPath);
    } catch (error) {
      throw new Error(
        `Failed to read directory ${dirPath}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Resolves versioned JSON file paths
   * @private
   */
  private static resolveNumberedJson(dirPath: string): {
    baseDir: string;
    baseFile: string;
    latestFilePath?: string;
    nextFilePath: string;
  } {
    const baseDir = path.dirname(dirPath);
    const baseFile = path.basename(dirPath);

    let files: { path: string; num: number }[] = [];
    let nextNumber = 1;

    try {
      if (fs.existsSync(baseDir)) {
        const filePattern = new RegExp(`${baseFile}-(\\d+)\\.json`);
        files = fs
          .readdirSync(baseDir)
          .filter(
            (file) => file.startsWith(`${baseFile}-`) && file.endsWith('.json'),
          )
          .map((file) => {
            const match = filePattern.exec(file);
            if (!match) return null;
            return {
              path: path.join(baseDir, file),
              num: Number.parseInt(match[1], 10),
            };
          })
          .filter(
            (entry): entry is { path: string; num: number } => entry !== null,
          )
          .sort((a, b) => b.num - a.num);

        if (files.length > 0) {
          nextNumber = files[0].num + 1;
        }
      }
    } catch {
      // If directory doesn't exist or can't be read, return version 1
      nextNumber = 1;
      console.warn(`Warning: Could not read directory ${baseDir}`);
    }

    return {
      baseDir,
      baseFile,
      latestFilePath: files[0]?.path,
      nextFilePath: path.join(baseDir, `${baseFile}-${nextNumber}.json`),
    };
  }
}
