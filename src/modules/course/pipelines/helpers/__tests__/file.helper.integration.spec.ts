import * as fs from 'node:fs';
import * as path from 'node:path';

import { FileHelper } from '../file.helper';

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
});
