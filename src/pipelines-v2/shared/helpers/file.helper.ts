import * as fs from 'fs';
import * as path from 'path';

export class FileHelper {
  /**
   * Reads the latest JSON file from a directory path based on numeric suffix
   * @param dirPath Directory path like 'src/pipelines/occupation/data/occupation'
   * @returns The parsed JSON data from the latest file
   */
  static readLatestJson<T>(dirPath: string): T {
    const { baseDir, baseFile, latestFileName, latestFilePath } =
      this.resolveNumberedJson(dirPath);

    if (!fs.existsSync(baseDir)) {
      throw new Error(`Directory does not exist: ${baseDir}`);
    }

    if (!latestFilePath || !latestFileName) {
      throw new Error(
        `No valid numbered JSON files found matching pattern ${baseFile}- in ${baseDir}`,
      );
    }

    const fileContent = fs.readFileSync(latestFilePath, 'utf8');

    console.log(`Reading latest JSON file: ${latestFileName}`);

    return JSON.parse(fileContent) as T;
  }

  /**
   * Appends data to the latest JSON file, creating a new one if none exists
   * @param dirPath Directory path like 'src/pipelines/occupation/data/occupation'
   * @param data Data to append
   */
  static appendToLatestJson<T>(dirPath: string, data: T): void {
    const { baseDir, latestFileName, latestFilePath, nextFilePath } =
      this.resolveNumberedJson(dirPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`Created directory: ${baseDir}`);
    }

    let existingDataRaw: unknown = [];

    if (latestFilePath) {
      try {
        const fileContent = fs.readFileSync(latestFilePath, 'utf8');
        console.log(`Reading latest JSON file: ${latestFileName}`);
        existingDataRaw = JSON.parse(fileContent);
      } catch {
        existingDataRaw = [];
      }
    }

    const existingData = Array.isArray(existingDataRaw)
      ? existingDataRaw
      : [existingDataRaw];

    // Type assertion to handle the unknown type safely
    const safeData = Array.isArray(data) ? (data as unknown[]) : [data];

    if (safeData.length === 0) {
      console.log(`No new data to append for ${dirPath}`);
      return;
    }

    const newData = [...existingData, ...safeData];

    const targetFilePath = latestFilePath ?? nextFilePath;

    fs.writeFileSync(targetFilePath, JSON.stringify(newData, null, 2));

    console.log(
      latestFilePath
        ? `Appended data to existing file: ${targetFilePath}`
        : `Created file and saved data: ${targetFilePath}`,
    );
  }

  /**
   * Saves data as a new JSON file with incremented number
   * @param dirPath Directory path like 'src/pipelines/occupation/data/occupation'
   * @param data Data to save
   */
  static saveAsLatestJson<T>(dirPath: string, data: T): void {
    const { baseDir, nextFilePath } = this.resolveNumberedJson(dirPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`Created directory: ${baseDir}`);
    }

    fs.writeFileSync(nextFilePath, JSON.stringify(data, null, 2));

    console.log(`Saved data to new file: ${nextFilePath}`);
  }

  /**
   * Overwrites the latest JSON file with new data, create new file if none exists
   * @param dirPath Directory path like 'src/pipelines/occupation/data/occupation'
   * @param data Data to overwrite
   */
  static overwriteLatestJson<T>(dirPath: string, data: T): void {
    const { baseDir, latestFilePath, nextFilePath } =
      this.resolveNumberedJson(dirPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`Created directory: ${baseDir}`);
    }

    const targetFilePath = latestFilePath ?? nextFilePath;
    fs.writeFileSync(targetFilePath, JSON.stringify(data, null, 2));

    console.log(`Overwrote data in file: ${targetFilePath}`);
  }

  private static resolveNumberedJson(dirPath: string): {
    baseDir: string;
    baseFile: string;
    latestFileName?: string;
    latestFilePath?: string;
    nextFilePath: string;
  } {
    const baseDir = path.dirname(dirPath);
    const baseFile = path.basename(dirPath);

    if (!fs.existsSync(baseDir)) {
      return {
        baseDir,
        baseFile,
        nextFilePath: path.join(baseDir, `${baseFile}-1.json`),
      };
    }

    const filePattern = new RegExp(`${baseFile}-(\\d+)\\.json`);
    const files = fs
      .readdirSync(baseDir)
      .filter((file) => file.startsWith(`${baseFile}-`))
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const match = filePattern.exec(file);
        if (!match) {
          return null;
        }

        return {
          file,
          num: parseInt(match[1], 10),
          path: path.join(baseDir, file),
        };
      })
      .filter((entry): entry is { file: string; num: number; path: string } =>
        Boolean(entry),
      );

    const latest = files.sort((a, b) => a.num - b.num).pop();
    const nextNumber = latest ? latest.num + 1 : 1;

    return {
      baseDir,
      baseFile,
      latestFileName: latest?.file,
      latestFilePath: latest?.path,
      nextFilePath: path.join(baseDir, `${baseFile}-${nextNumber}.json`),
    };
  }
}
