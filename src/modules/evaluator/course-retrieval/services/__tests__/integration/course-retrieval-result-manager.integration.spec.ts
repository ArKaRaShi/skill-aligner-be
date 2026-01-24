import { Test, TestingModule } from '@nestjs/testing';

import * as os from 'node:os';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import type { EvaluateRetrieverOutput } from '../../../types/course-retrieval.types';
import { CourseRetrievalResultManagerService } from '../../course-retrieval-result-manager.service';

// Helper to create temp directory
const getTempDir = () =>
  path.join(os.tmpdir(), `course-retrieval-result-manager-test-${Date.now()}`);

describe('CourseRetrievalResultManagerService Integration', () => {
  let service: CourseRetrievalResultManagerService;
  let tempDir: string;

  beforeAll(() => {
    tempDir = getTempDir();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseRetrievalResultManagerService],
    })
      .overrideProvider(CourseRetrievalResultManagerService)
      .useFactory({
        factory: () => {
          return new CourseRetrievalResultManagerService(tempDir);
        },
      })
      .compile();

    service = module.get<CourseRetrievalResultManagerService>(
      CourseRetrievalResultManagerService,
    );
  });

  afterEach(async () => {
    // Clean up temp directory
    await FileHelper.deleteDirectory(tempDir);
  });

  describe('ensureDirectoryStructure', () => {
    it('should create all required directories', async () => {
      // Act
      await service.ensureDirectoryStructure('test-set-1');

      // Assert - directories should exist (no error = success)
      const expectedDirs = [
        path.join(tempDir, 'test-set-1', 'records'),
        path.join(tempDir, 'test-set-1', 'progress'),
      ];

      for (const dir of expectedDirs) {
        const exists = FileHelper.exists(dir);
        expect(exists).toBe(true);
      }

      // Check for .gitkeep files created by FileHelper.saveJson
      const gitkeepFiles = [
        path.join(tempDir, 'test-set-1', 'records', '.gitkeep'),
        path.join(tempDir, 'test-set-1', 'progress', '.gitkeep'),
      ];

      for (const file of gitkeepFiles) {
        const exists = FileHelper.exists(file);
        expect(exists).toBe(true);
      }
    });

    it('should be idempotent - calling multiple times should not error', async () => {
      // Act
      await service.ensureDirectoryStructure('test-set-idempotent');
      await service.ensureDirectoryStructure('test-set-idempotent');

      // Assert - should complete without errors
      const dirPath = path.join(tempDir, 'test-set-idempotent');
      const exists = FileHelper.exists(dirPath);
      expect(exists).toBe(true);
    });
  });

  describe('loadProgress', () => {
    it('should return empty progress structure when no progress file exists', async () => {
      // Act
      const progress = await service.loadProgress({
        testSetName: 'non-existent',
        iterationNumber: 1,
      });

      // Assert
      expect(progress.testSetName).toBe('non-existent');
      expect(progress.iterationNumber).toBe(1);
      expect(progress.entries).toEqual([]);
      expect(progress.lastUpdated).toBeDefined();
      expect(progress.statistics.totalItems).toBe(0);
      expect(progress.statistics.completedItems).toBe(0);
      expect(progress.statistics.pendingItems).toBe(0);
      expect(progress.statistics.completionPercentage).toBe(0);
    });

    it('should load existing progress file', async () => {
      // Arrange - manually create a progress file
      const testSetName = 'test-load-progress';
      const iterationNumber = 1;
      const progressDir = path.join(tempDir, testSetName, 'progress');

      await FileHelper.saveJson(path.join(progressDir, '.gitkeep'), '');
      await FileHelper.saveJson(
        path.join(progressDir, `progress-iteration-${iterationNumber}.json`),
        {
          testSetName,
          iterationNumber,
          entries: [
            {
              hash: 'a'.repeat(64),
              question: 'Test question?',
              skill: 'Test skill',
              testCaseId: 'test-001',
              completedAt: new Date().toISOString(),
              result: {
                retrievedCount: 2,
                averageRelevance: 2.5,
              },
            },
          ],
          lastUpdated: new Date().toISOString(),
          statistics: {
            totalItems: 1,
            completedItems: 1,
            pendingItems: 0,
            completionPercentage: 100,
          },
        },
      );

      // Act
      const progress = await service.loadProgress({
        testSetName,
        iterationNumber,
      });

      // Assert
      expect(progress.testSetName).toBe(testSetName);
      expect(progress.iterationNumber).toBe(iterationNumber);
      expect(progress.entries).toHaveLength(1);
      expect(progress.entries[0].hash).toBe('a'.repeat(64));
      expect(progress.statistics.totalItems).toBe(1);
      expect(progress.statistics.completedItems).toBe(1);
    });
  });

  describe('saveProgress', () => {
    it('should save progress file with correct structure', async () => {
      // Arrange
      const testSetName = 'test-save-progress';
      const iterationNumber = 1;

      await service.ensureDirectoryStructure(testSetName);

      const progressData = {
        testSetName,
        iterationNumber,
        entries: [
          {
            hash: 'a'.repeat(64),
            question: 'Test question?',
            skill: 'Test skill',
            testCaseId: 'test-001',
            completedAt: new Date().toISOString(),
            result: {
              retrievedCount: 2,
              averageRelevance: 2.5,
            },
          },
        ],
        lastUpdated: new Date().toISOString(),
        statistics: {
          totalItems: 1,
          completedItems: 1,
          pendingItems: 0,
          completionPercentage: 100,
        },
      };

      // Act
      await service.saveProgress(progressData);

      // Assert - file should exist
      const progressPath = path.join(
        tempDir,
        testSetName,
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );

      const exists = FileHelper.exists(progressPath);
      expect(exists).toBe(true);

      // Verify content
      const loaded =
        await FileHelper.loadJson<typeof progressData>(progressPath);
      expect(loaded).toEqual(progressData);
    });

    it('should update existing progress file when saved multiple times', async () => {
      // Arrange
      const testSetName = 'test-update-progress';
      const iterationNumber = 1;

      await service.ensureDirectoryStructure(testSetName);

      const progressData = {
        testSetName,
        iterationNumber,
        entries: [
          {
            hash: 'a'.repeat(64),
            question: 'First?',
            skill: 'Skill 1',
            testCaseId: 'test-001',
            completedAt: new Date().toISOString(),
            result: { retrievedCount: 1, averageRelevance: 2 },
          },
        ],
        lastUpdated: new Date().toISOString(),
        statistics: {
          totalItems: 2,
          completedItems: 1,
          pendingItems: 1,
          completionPercentage: 50,
        },
      };

      const progressPath = path.join(
        tempDir,
        testSetName,
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );

      // Act - save first time
      await service.saveProgress(progressData);

      // Update and save again
      progressData.entries.push({
        hash: 'b'.repeat(64),
        question: 'Second?',
        skill: 'Skill 2',
        testCaseId: 'test-002',
        completedAt: new Date().toISOString(),
        result: { retrievedCount: 1, averageRelevance: 3 },
      });
      progressData.statistics.completedItems = 2;
      progressData.statistics.pendingItems = 0;
      progressData.statistics.completionPercentage = 100;
      progressData.lastUpdated = new Date().toISOString();

      await service.saveProgress(progressData);

      // Assert - file should have both entries
      const loaded =
        await FileHelper.loadJson<typeof progressData>(progressPath);
      expect(loaded.entries).toHaveLength(2);
      expect(loaded.entries[0].hash).toBe('a'.repeat(64));
      expect(loaded.entries[1].hash).toBe('b'.repeat(64));
      expect(loaded.statistics.completedItems).toBe(2);
    });
  });

  describe('saveIterationRecords', () => {
    it('should save iteration records file', async () => {
      // Arrange
      const testSetName = 'test-save-records';
      const iterationNumber = 1;

      await service.ensureDirectoryStructure(testSetName);

      const records: EvaluateRetrieverOutput[] = [
        {
          testCaseId: 'test-001',
          question: 'Question 1?',
          skill: 'Skill 1',
          retrievedCount: 2,
          evaluations: [
            {
              subjectCode: 'CS101',
              subjectName: 'Intro to Python',
              relevanceScore: 3,
              reason: 'Good match',
            },
          ],
          metrics: {
            totalCourses: 1,
            averageRelevance: 3,
            scoreDistribution: [
              { relevanceScore: 3, count: 1, percentage: 100 },
              { relevanceScore: 2, count: 0, percentage: 0 },
              { relevanceScore: 1, count: 0, percentage: 0 },
              { relevanceScore: 0, count: 0, percentage: 0 },
            ],
            highlyRelevantCount: 1,
            highlyRelevantRate: 100,
            irrelevantCount: 0,
            irrelevantRate: 0,
          },
          llmModel: 'gpt-4',
          llmProvider: 'openai',
          inputTokens: 100,
          outputTokens: 50,
        },
      ];

      // Act
      await service.saveIterationRecords({
        testSetName,
        iterationNumber,
        records,
      });

      // Assert
      const recordsPath = path.join(
        tempDir,
        testSetName,
        'records',
        `records-iteration-${iterationNumber}.json`,
      );

      const exists = FileHelper.exists(recordsPath);
      expect(exists).toBe(true);

      const loaded = await FileHelper.loadJson<typeof records>(recordsPath);
      expect(loaded).toEqual(records);
    });

    it('should save multiple iterations without conflicts', async () => {
      // Arrange
      const testSetName = 'test-multiple-iterations';

      await service.ensureDirectoryStructure(testSetName);

      const records1: EvaluateRetrieverOutput[] = [
        {
          testCaseId: 'test-001',
          question: 'Q1?',
          skill: 'S1',
          retrievedCount: 1,
          evaluations: [],
          metrics: {
            totalCourses: 1,
            averageRelevance: 2,
            scoreDistribution: [],
            highlyRelevantCount: 0,
            highlyRelevantRate: 0,
            irrelevantCount: 0,
            irrelevantRate: 0,
          },
          llmModel: 'gpt-4',
          llmProvider: 'openai',
          inputTokens: 100,
          outputTokens: 50,
        },
      ];

      const records2: EvaluateRetrieverOutput[] = [
        {
          testCaseId: 'test-002',
          question: 'Q2?',
          skill: 'S2',
          retrievedCount: 1,
          evaluations: [],
          metrics: {
            totalCourses: 1,
            averageRelevance: 3,
            scoreDistribution: [],
            highlyRelevantCount: 0,
            highlyRelevantRate: 0,
            irrelevantCount: 0,
            irrelevantRate: 0,
          },
          llmModel: 'gpt-4',
          llmProvider: 'openai',
          inputTokens: 200,
          outputTokens: 100,
        },
      ];

      // Act
      await service.saveIterationRecords({
        testSetName,
        iterationNumber: 1,
        records: records1,
      });

      await service.saveIterationRecords({
        testSetName,
        iterationNumber: 2,
        records: records2,
      });

      // Assert - both files should exist independently
      const recordsPath1 = path.join(
        tempDir,
        testSetName,
        'records',
        'records-iteration-1.json',
      );
      const recordsPath2 = path.join(
        tempDir,
        testSetName,
        'records',
        'records-iteration-2.json',
      );

      expect(FileHelper.exists(recordsPath1)).toBe(true);
      expect(FileHelper.exists(recordsPath2)).toBe(true);

      const loaded1 = await FileHelper.loadJson<typeof records1>(recordsPath1);
      const loaded2 = await FileHelper.loadJson<typeof records2>(recordsPath2);

      expect(loaded1).toHaveLength(1);
      expect(loaded2).toHaveLength(1);
      expect(loaded1[0].testCaseId).toBe('test-001');
      expect(loaded2[0].testCaseId).toBe('test-002');
    });
  });

  describe('loadIterationRecords', () => {
    it('should return empty array when records file does not exist', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-load-records');

      // Act
      const records = await service.loadIterationRecords({
        testSetName: 'test-load-records',
        iterationNumber: 1,
      });

      // Assert
      expect(records).toEqual([]);
    });

    it('should load existing records file', async () => {
      // Arrange
      const testSetName = 'test-load-existing-records';
      const iterationNumber = 1;

      await service.ensureDirectoryStructure(testSetName);

      const records: EvaluateRetrieverOutput[] = [
        {
          testCaseId: 'test-001',
          question: 'Question?',
          skill: 'Skill',
          retrievedCount: 1,
          evaluations: [],
          metrics: {
            totalCourses: 1,
            averageRelevance: 2,
            scoreDistribution: [],
            highlyRelevantCount: 0,
            highlyRelevantRate: 0,
            irrelevantCount: 0,
            irrelevantRate: 0,
          },
          llmModel: 'gpt-4',
          llmProvider: 'openai',
          inputTokens: 100,
          outputTokens: 50,
        },
      ];

      const recordsPath = path.join(
        tempDir,
        testSetName,
        'records',
        `records-iteration-${iterationNumber}.json`,
      );

      await FileHelper.saveJson(recordsPath, records);

      // Act
      const loaded = await service.loadIterationRecords({
        testSetName,
        iterationNumber,
      });

      // Assert
      expect(loaded).toEqual(records);
    });
  });

  describe('Progress file format validation', () => {
    it('should maintain correct progress file format across save/load cycle', async () => {
      // Arrange
      const testSetName = 'test-format-validation';
      const iterationNumber = 2;

      await service.ensureDirectoryStructure(testSetName);

      const originalProgress = {
        testSetName,
        iterationNumber,
        entries: [
          {
            hash: 'abc123def456'.padEnd(64, '0'),
            question: 'Format validation question?',
            skill: 'Format skill',
            testCaseId: 'fmt-001',
            completedAt: '2025-01-24T12:00:00.000Z',
            result: {
              retrievedCount: 3,
              averageRelevance: 2.33,
            },
          },
        ],
        lastUpdated: '2025-01-24T12:00:00.000Z',
        statistics: {
          totalItems: 5,
          completedItems: 2,
          pendingItems: 3,
          completionPercentage: 40,
        },
      };

      // Act
      await service.saveProgress(originalProgress);

      const loaded = await service.loadProgress({
        testSetName,
        iterationNumber,
      });

      // Assert
      expect(loaded).toEqual(originalProgress);
    });

    it('should preserve hash format (64 hex characters)', async () => {
      // Arrange
      const testSetName = 'test-hash-format';
      const iterationNumber = 1;

      await service.ensureDirectoryStructure(testSetName);

      const progressWithHash = {
        testSetName,
        iterationNumber,
        entries: [
          {
            hash: 'a1b2c3d4e5f6'.padEnd(64, '0'),
            question: 'Hash question?',
            skill: 'Hash skill',
            testCaseId: 'hash-001',
            completedAt: new Date().toISOString(),
            result: {
              retrievedCount: 1,
              averageRelevance: 2,
            },
          },
        ],
        lastUpdated: new Date().toISOString(),
        statistics: {
          totalItems: 1,
          completedItems: 1,
          pendingItems: 0,
          completionPercentage: 100,
        },
      };

      // Act
      await service.saveProgress(progressWithHash);

      // Assert - verify hash is preserved
      const loaded = await service.loadProgress({
        testSetName,
        iterationNumber,
      });

      expect(loaded.entries[0].hash).toHaveLength(64);
      expect(loaded.entries[0].hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Empty state handling', () => {
    it('should handle empty entries array correctly', async () => {
      // Arrange
      const testSetName = 'test-empty-entries';
      const iterationNumber = 1;

      await service.ensureDirectoryStructure(testSetName);

      const emptyProgress = {
        testSetName,
        iterationNumber,
        entries: [],
        lastUpdated: new Date().toISOString(),
        statistics: {
          totalItems: 0,
          completedItems: 0,
          pendingItems: 0,
          completionPercentage: 0,
        },
      };

      // Act
      await service.saveProgress(emptyProgress);

      // Assert
      const loaded = await service.loadProgress({
        testSetName,
        iterationNumber,
      });

      expect(loaded.entries).toEqual([]);
      expect(loaded.statistics.totalItems).toBe(0);
    });

    it('should handle large number of entries', async () => {
      // Arrange
      const testSetName = 'test-large-entries';
      const iterationNumber = 1;

      await service.ensureDirectoryStructure(testSetName);

      const largeProgress = {
        testSetName,
        iterationNumber,
        entries: Array.from({ length: 100 }, (_, i) => ({
          hash: 'hash'.padEnd(64, '0') + i,
          question: `Question ${i}?`,
          skill: `Skill ${i}`,
          testCaseId: `test-${i}`,
          completedAt: new Date().toISOString(),
          result: {
            retrievedCount: 1,
            averageRelevance: 2,
          },
        })),
        lastUpdated: new Date().toISOString(),
        statistics: {
          totalItems: 100,
          completedItems: 100,
          pendingItems: 0,
          completionPercentage: 100,
        },
      };

      // Act
      await service.saveProgress(largeProgress);

      // Assert
      const loaded = await service.loadProgress({
        testSetName,
        iterationNumber,
      });

      expect(loaded.entries).toHaveLength(100);
      expect(loaded.statistics.totalItems).toBe(100);
    });
  });

  describe('getBaseDir', () => {
    it('should return the base directory path', () => {
      // Act
      const baseDir = service.getBaseDir();

      // Assert
      expect(baseDir).toBe(tempDir);
    });
  });
});
