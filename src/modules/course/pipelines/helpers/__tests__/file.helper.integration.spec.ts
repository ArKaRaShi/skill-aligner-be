import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

describe('FileHelper', () => {
  const testDir = path.join(__dirname, 'temp');
  const cleanTestDir = () => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  };

  beforeEach(() => {
    cleanTestDir();
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    cleanTestDir();
  });

  describe('loadCsv', () => {
    it('should successfully load and parse CSV file', async () => {
      // Arrange
      const csvContent = 'id,name\n1,Test Item\n2,Another Item';
      const filePath = path.join(testDir, 'test.csv');
      fs.writeFileSync(filePath, csvContent);

      // Act
      const result = await FileHelper.loadCsv<{ id: string; name: string }>(
        filePath,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: '1', name: 'Test Item' });
      expect(result[1]).toEqual({ id: '2', name: 'Another Item' });
    });

    it('should throw error if CSV file does not exist', async () => {
      // Arrange
      const filePath = path.join(testDir, 'nonexistent.csv');

      // Act & Assert
      await expect(FileHelper.loadCsv(filePath)).rejects.toThrow(
        'CSV file not found',
      );
    });
  });

  describe('loadJson', () => {
    it('should successfully load and parse JSON file', async () => {
      // Arrange
      const jsonData = { key: 'value', items: [1, 2, 3] };
      const filePath = path.join(testDir, 'test.json');
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));

      // Act
      const result = await FileHelper.loadJson<typeof jsonData>(filePath);

      // Assert
      expect(result).toEqual(jsonData);
    });

    it('should throw error if JSON file does not exist', async () => {
      // Arrange
      const filePath = path.join(testDir, 'nonexistent.json');

      // Act & Assert
      await expect(FileHelper.loadJson(filePath)).rejects.toThrow(
        'JSON file not found',
      );
    });
  });

  describe('loadLatestJson', () => {
    it('should load the latest versioned JSON file', async () => {
      // Arrange
      const jsonData1 = { version: 1, data: 'old' };
      const jsonData2 = { version: 2, data: 'new' };
      const baseDir = path.join(testDir, 'versioned');
      fs.mkdirSync(baseDir, { recursive: true });

      fs.writeFileSync(
        path.join(baseDir, 'data-1.json'),
        JSON.stringify(jsonData1, null, 2),
      );
      fs.writeFileSync(
        path.join(baseDir, 'data-2.json'),
        JSON.stringify(jsonData2, null, 2),
      );

      // Act
      const result = await FileHelper.loadLatestJson<typeof jsonData2>(
        path.join(baseDir, 'data'),
      );

      // Assert
      expect(result).toEqual(jsonData2);
    });

    it('should throw error if directory does not exist', async () => {
      // Arrange
      const nonexistentDir = path.join(testDir, 'nonexistent-dir');
      fs.rmSync(nonexistentDir, { recursive: true, force: true }); // Ensure directory doesn't exist

      // Act & Assert
      await expect(FileHelper.loadLatestJson(nonexistentDir)).rejects.toThrow(
        'Directory not found',
      );
    });

    it('should throw error if no matching files exist', async () => {
      // Arrange
      const emptyDir = path.join(testDir, 'empty-dir');
      fs.mkdirSync(emptyDir, { recursive: true });

      // Act & Assert
      await expect(FileHelper.loadLatestJson(emptyDir)).rejects.toThrow(
        'No valid versioned JSON files found',
      );
    });
  });

  describe('saveJson', () => {
    it('should successfully save JSON file and create directories', async () => {
      // Arrange
      const jsonData = { key: 'value', nested: { items: [1, 2, 3] } };
      const filePath = path.join(testDir, 'nested', 'deep', 'test.json');

      // Act
      await FileHelper.saveJson(filePath, jsonData);

      // Assert
      const savedData = JSON.parse(
        fs.readFileSync(filePath, 'utf8'),
      ) as typeof jsonData;
      expect(savedData).toEqual(jsonData);
      expect(fs.existsSync(path.dirname(filePath))).toBe(true);
    });
  });

  describe('saveLatestJson', () => {
    it('should save with incremented version number', async () => {
      // Arrange
      const jsonData1 = { version: 1 };
      const jsonData2 = { version: 2 };
      const baseDir = path.join(testDir, 'versioned');
      const basePath = path.join(baseDir, 'data');

      // Act
      const result1 = await FileHelper.saveLatestJson(basePath, jsonData1);
      const result2 = await FileHelper.saveLatestJson(basePath, jsonData2);

      // Assert
      expect(path.basename(result1)).toBe('data-1.json');
      expect(path.basename(result2)).toBe('data-2.json');

      const saved1 = JSON.parse(
        fs.readFileSync(result1, 'utf8'),
      ) as typeof jsonData1;
      const saved2 = JSON.parse(
        fs.readFileSync(result2, 'utf8'),
      ) as typeof jsonData2;
      expect(saved1).toEqual(jsonData1);
      expect(saved2).toEqual(jsonData2);
    });

    it('should start with version 1 if no files exist', async () => {
      // Arrange
      const jsonData = { initial: true };
      const basePath = path.join(testDir, 'versioned', 'data');

      // Act
      const result = await FileHelper.saveLatestJson(basePath, jsonData);

      // Assert
      expect(path.basename(result)).toBe('data-1.json');
      const saved = JSON.parse(
        fs.readFileSync(result, 'utf8'),
      ) as typeof jsonData;
      expect(saved).toEqual(jsonData);
    });
  });

  describe('loadJsonDirectory', () => {
    type TestRecord = {
      id: string;
      name: string;
      value: number;
    };

    it('should successfully load all JSON files from a directory', async () => {
      // Arrange
      const record1: TestRecord = { id: '1', name: 'First', value: 100 };
      const record2: TestRecord = { id: '2', name: 'Second', value: 200 };
      const record3: TestRecord = { id: '3', name: 'Third', value: 300 };
      const recordsDir = path.join(testDir, 'records');
      fs.mkdirSync(recordsDir, { recursive: true });

      fs.writeFileSync(
        path.join(recordsDir, 'record1.json'),
        JSON.stringify(record1, null, 2),
      );
      fs.writeFileSync(
        path.join(recordsDir, 'record2.json'),
        JSON.stringify(record2, null, 2),
      );
      fs.writeFileSync(
        path.join(recordsDir, 'record3.json'),
        JSON.stringify(record3, null, 2),
      );

      // Act
      const result = await FileHelper.loadJsonDirectory<TestRecord>(recordsDir);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toContainEqual(record1);
      expect(result).toContainEqual(record2);
      expect(result).toContainEqual(record3);
    });

    it('should return empty array when directory contains no JSON files', async () => {
      // Arrange
      const emptyDir = path.join(testDir, 'empty-dir');
      fs.mkdirSync(emptyDir, { recursive: true });

      // Act
      const result = await FileHelper.loadJsonDirectory<TestRecord>(emptyDir);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when directory does not exist', async () => {
      // Arrange
      const nonexistentDir = path.join(testDir, 'nonexistent-dir');
      // Ensure directory doesn't exist
      fs.rmSync(nonexistentDir, { recursive: true, force: true });

      // Act & Assert
      await expect(
        FileHelper.loadJsonDirectory<TestRecord>(nonexistentDir),
      ).rejects.toThrow('Directory not found');
    });

    it('should ignore non-JSON files in the directory', async () => {
      // Arrange
      const record: TestRecord = { id: '1', name: 'Only', value: 100 };
      const mixedDir = path.join(testDir, 'mixed');
      fs.mkdirSync(mixedDir, { recursive: true });

      fs.writeFileSync(
        path.join(mixedDir, 'data.json'),
        JSON.stringify(record, null, 2),
      );
      fs.writeFileSync(path.join(mixedDir, 'readme.txt'), 'Some text');
      fs.writeFileSync(path.join(mixedDir, 'data.csv'), 'id,name\n1,Test');
      fs.writeFileSync(path.join(mixedDir, '.gitkeep'), '');

      // Act
      const result = await FileHelper.loadJsonDirectory<TestRecord>(mixedDir);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(record);
    });

    it('should throw error when a JSON file is malformed', async () => {
      // Arrange
      const validRecord: TestRecord = { id: '1', name: 'Valid', value: 100 };
      const corruptedDir = path.join(testDir, 'corrupted');
      fs.mkdirSync(corruptedDir, { recursive: true });

      fs.writeFileSync(
        path.join(corruptedDir, 'valid.json'),
        JSON.stringify(validRecord, null, 2),
      );
      fs.writeFileSync(
        path.join(corruptedDir, 'invalid.json'),
        '{ invalid json content',
      );

      // Act & Assert
      await expect(
        FileHelper.loadJsonDirectory<TestRecord>(corruptedDir),
      ).rejects.toThrow('Failed to parse JSON file invalid.json');
    });

    it('should handle hash-based filenames (ADR-0002 pattern)', async () => {
      // Arrange
      type HashRecord = {
        hash: string;
        queryLogId: string;
        question: string;
      };
      const recordsDir = path.join(testDir, 'records', 'iteration-1');
      fs.mkdirSync(recordsDir, { recursive: true });

      const hash1 = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      const hash2 = 'z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4';
      const record1: HashRecord = {
        hash: hash1,
        queryLogId: 'ql-1',
        question: 'What is AI?',
      };
      const record2: HashRecord = {
        hash: hash2,
        queryLogId: 'ql-2',
        question: 'Explain machine learning.',
      };

      fs.writeFileSync(
        path.join(recordsDir, `${hash1}.json`),
        JSON.stringify(record1, null, 2),
      );
      fs.writeFileSync(
        path.join(recordsDir, `${hash2}.json`),
        JSON.stringify(record2, null, 2),
      );

      // Act
      const result = await FileHelper.loadJsonDirectory<HashRecord>(recordsDir);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(record1);
      expect(result).toContainEqual(record2);
    });
  });
});
