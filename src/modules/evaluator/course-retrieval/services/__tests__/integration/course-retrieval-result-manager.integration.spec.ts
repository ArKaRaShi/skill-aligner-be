import { Test, TestingModule } from '@nestjs/testing';

import * as os from 'node:os';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import { EvaluationHashUtil } from '../../../../shared/utils/evaluation-hash.util';
import type {
  CourseRetrievalIterationMetrics,
  EvaluateRetrieverOutput,
} from '../../../types/course-retrieval.types';
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
            ndcg: { at5: 1, at10: 1, atAll: 1 },
            precision: { at5: 1, at10: 1, atAll: 1 },
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
            ndcg: { at5: 1, at10: 1, atAll: 1 },
            precision: { at5: 1, at10: 1, atAll: 1 },
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
            ndcg: { at5: 1, at10: 1, atAll: 1 },
            precision: { at5: 1, at10: 1, atAll: 1 },
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

      const record: EvaluateRetrieverOutput = {
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
          ndcg: { at5: 1, at10: 1, atAll: 1 },
          precision: { at5: 1, at10: 1, atAll: 1 },
        },
        llmModel: 'gpt-4',
        llmProvider: 'openai',
        inputTokens: 100,
        outputTokens: 50,
      };

      // Save using ADR-0002 hash-based pattern
      const hash = EvaluationHashUtil.generateCourseRetrievalRecordHash({
        question: record.question,
        skill: record.skill,
        testCaseId: record.testCaseId,
      });
      await service.saveRecord({
        testSetName,
        iterationNumber,
        hash,
        record,
      });

      // Act
      const loaded = await service.loadIterationRecords({
        testSetName,
        iterationNumber,
      });

      // Assert
      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toEqual(record);
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

  describe('saveIterationMetrics', () => {
    it('should save iteration metrics file with correct structure', async () => {
      // Arrange
      const testSetName = 'test-save-metrics';
      const iterationNumber = 1;

      await service.ensureDirectoryStructure(testSetName);

      const records: EvaluateRetrieverOutput[] = [
        {
          testCaseId: 'test-001',
          question: 'How to learn Python?',
          skill: 'Python programming',
          retrievedCount: 3,
          evaluations: [
            {
              subjectCode: 'CS101',
              subjectName: 'Intro to Python',
              relevanceScore: 3,
              reason: 'Perfect match',
            },
            {
              subjectCode: 'CS102',
              subjectName: 'Advanced Python',
              relevanceScore: 2,
              reason: 'Related',
            },
            {
              subjectCode: 'MATH101',
              subjectName: 'Calculus',
              relevanceScore: 0,
              reason: 'Not relevant',
            },
          ],
          metrics: {
            totalCourses: 3,
            averageRelevance: 1.667,
            scoreDistribution: [],
            highlyRelevantCount: 1,
            highlyRelevantRate: 33.33,
            irrelevantCount: 1,
            irrelevantRate: 33.33,
            ndcg: { at5: 0.8, at10: 0.8, atAll: 0.75 },
            precision: { at5: 0.67, at10: 0.67, atAll: 0.67 },
          },
          llmModel: 'gpt-4',
          llmProvider: 'openai',
          inputTokens: 200,
          outputTokens: 100,
        },
      ];

      // Act
      const savedPath = await service.saveIterationMetrics({
        testSetName,
        iterationNumber,
        records,
      });

      // Assert - file should exist
      const metricsPath = path.join(
        tempDir,
        testSetName,
        'metrics',
        `metrics-iteration-${iterationNumber}.json`,
      );

      expect(savedPath).toBe(metricsPath);
      expect(FileHelper.exists(metricsPath)).toBe(true);

      // Verify content structure
      const metrics =
        await FileHelper.loadJson<CourseRetrievalIterationMetrics>(metricsPath);
      expect(metrics.iteration).toBe(1);
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.sampleCount).toBe(1);
      expect(metrics.totalCoursesEvaluated).toBe(3);
      // Enriched metrics - check the .value property
      expect(metrics.averageRelevance.value).toBeCloseTo(1.667, 2);
      expect(metrics.ndcg.at5.value).toBeDefined();
      expect(metrics.ndcg.at10.value).toBeDefined();
      expect(metrics.ndcg.atAll.value).toBeDefined();
      expect(metrics.precision.at5.value).toBeDefined();
      expect(metrics.precision.at10.value).toBeDefined();
      expect(metrics.precision.atAll.value).toBeDefined();
      // Check descriptions exist
      expect(metrics.averageRelevance.description).toBeDefined();
      expect(metrics.ndcg.at5.description).toBeDefined();
    });

    it('should handle multiple samples in single iteration', async () => {
      // Arrange
      const testSetName = 'test-multiple-samples';
      const iterationNumber = 2;

      await service.ensureDirectoryStructure(testSetName);

      const records: EvaluateRetrieverOutput[] = Array.from(
        { length: 5 },
        (_, i) => ({
          testCaseId: `test-${i}`,
          question: `Question ${i}?`,
          skill: `Skill ${i}`,
          retrievedCount: 2,
          evaluations: [
            {
              subjectCode: `CS${100 + i}`,
              subjectName: `Course ${i}`,
              relevanceScore: 3,
              reason: 'Good',
            },
            {
              subjectCode: `CS${200 + i}`,
              subjectName: `Course ${i + 100}`,
              relevanceScore: 2,
              reason: 'Okay',
            },
          ],
          metrics: {
            totalCourses: 2,
            averageRelevance: 2.5,
            scoreDistribution: [],
            highlyRelevantCount: 1,
            highlyRelevantRate: 50,
            irrelevantCount: 0,
            irrelevantRate: 0,
            ndcg: { at5: 1, at10: 1, atAll: 1 },
            precision: { at5: 1, at10: 1, atAll: 1 },
          },
          llmModel: 'gpt-4',
          llmProvider: 'openai',
          inputTokens: 100,
          outputTokens: 50,
        }),
      );

      // Act
      await service.saveIterationMetrics({
        testSetName,
        iterationNumber,
        records,
      });

      // Assert
      const metricsPath = path.join(
        tempDir,
        testSetName,
        'metrics',
        `metrics-iteration-${iterationNumber}.json`,
      );

      const metrics =
        await FileHelper.loadJson<CourseRetrievalIterationMetrics>(metricsPath);
      expect(metrics.sampleCount).toBe(5);
      expect(metrics.totalCoursesEvaluated).toBe(10); // 5 samples × 2 courses each
    });
  });

  describe('calculateFinalMetrics', () => {
    it('should aggregate metrics across multiple iterations', async () => {
      // Arrange - Setup 3 iterations with different metrics
      const testSetName = 'test-final-metrics';
      const totalIterations = 3;

      await service.ensureDirectoryStructure(testSetName);

      // Create and save records for each iteration using ADR-0002 hash-based pattern
      for (let i = 1; i <= totalIterations; i++) {
        const records: EvaluateRetrieverOutput[] = [
          {
            testCaseId: `test-${i}`,
            question: `Question ${i}?`,
            skill: `Skill ${i}`,
            retrievedCount: 3,
            evaluations: [
              {
                subjectCode: 'CS101',
                subjectName: 'Course 1',
                relevanceScore: i, // Varying scores across iterations
                reason: 'Good',
              },
              {
                subjectCode: 'CS102',
                subjectName: 'Course 2',
                relevanceScore: 2,
                reason: 'Okay',
              },
              {
                subjectCode: 'CS103',
                subjectName: 'Course 3',
                relevanceScore: 1,
                reason: 'Fair',
              },
            ],
            metrics: {
              totalCourses: 3,
              averageRelevance: (i + 2 + 1) / 3,
              scoreDistribution: [],
              highlyRelevantCount: i >= 3 ? 1 : 0,
              highlyRelevantRate: i >= 3 ? 33.33 : 0,
              irrelevantCount: 0,
              irrelevantRate: 0,
              ndcg: {
                at5: 0.7 + i * 0.05,
                at10: 0.7 + i * 0.05,
                atAll: 0.65 + i * 0.05,
              },
              precision: {
                at5: 0.6 + i * 0.1,
                at10: 0.6 + i * 0.1,
                atAll: 0.6 + i * 0.1,
              },
            },
            llmModel: 'gpt-4',
            llmProvider: 'openai',
            inputTokens: 100 * i,
            outputTokens: 50 * i,
          },
        ];

        // Save each record using ADR-0002 hash-based pattern
        for (const record of records) {
          const hash = EvaluationHashUtil.generateCourseRetrievalRecordHash({
            question: record.question,
            skill: record.skill,
            testCaseId: record.testCaseId,
          });
          await service.saveRecord({
            testSetName,
            iterationNumber: i,
            hash,
            record,
          });
        }

        // Save iteration metrics
        await service.saveIterationMetrics({
          testSetName,
          iterationNumber: i,
          records,
        });
      }

      // Act
      const finalMetrics = await service.calculateFinalMetrics({
        testSetName,
        totalIterations,
      });

      // Assert - verify structure
      expect(finalMetrics.iterations).toBe(3);
      expect(finalMetrics.timestamp).toBeDefined();
      expect(finalMetrics.aggregateMetrics).toBeDefined();
      expect(finalMetrics.perIterationMetrics).toHaveLength(3);

      // Verify aggregate metrics have statistical structure
      expect(finalMetrics.aggregateMetrics.ndcgAt10).toHaveProperty('mean');
      expect(finalMetrics.aggregateMetrics.ndcgAt10).toHaveProperty('min');
      expect(finalMetrics.aggregateMetrics.ndcgAt10).toHaveProperty('max');
      expect(finalMetrics.aggregateMetrics.ndcgAt10).toHaveProperty('stdDev');

      expect(finalMetrics.aggregateMetrics.precisionAt10).toHaveProperty(
        'mean',
      );
      expect(finalMetrics.aggregateMetrics.precisionAt10).toHaveProperty(
        'stdDev',
      );

      // Verify per-iteration metrics are included
      expect(finalMetrics.perIterationMetrics[0].iteration).toBe(1);
      expect(finalMetrics.perIterationMetrics[1].iteration).toBe(2);
      expect(finalMetrics.perIterationMetrics[2].iteration).toBe(3);

      // Verify final metrics file was saved
      const finalMetricsPath = path.join(
        tempDir,
        testSetName,
        'final-metrics',
        `final-metrics-${totalIterations}.json`,
      );

      expect(FileHelper.exists(finalMetricsPath)).toBe(true);

      const savedMetrics = await FileHelper.loadJson(finalMetricsPath);
      expect(savedMetrics).toEqual(finalMetrics);
    });

    it('should handle single iteration (mean = min = max, stdDev = 0)', async () => {
      // Arrange
      const testSetName = 'test-single-iteration';
      const totalIterations = 1;

      await service.ensureDirectoryStructure(testSetName);

      const records: EvaluateRetrieverOutput[] = [
        {
          testCaseId: 'test-001',
          question: 'Question?',
          skill: 'Skill',
          retrievedCount: 2,
          evaluations: [
            {
              subjectCode: 'CS101',
              subjectName: 'Course 1',
              relevanceScore: 2,
              reason: 'Good',
            },
            {
              subjectCode: 'CS102',
              subjectName: 'Course 2',
              relevanceScore: 2,
              reason: 'Good',
            },
          ],
          metrics: {
            totalCourses: 2,
            averageRelevance: 2,
            scoreDistribution: [],
            highlyRelevantCount: 0,
            highlyRelevantRate: 0,
            irrelevantCount: 0,
            irrelevantRate: 0,
            ndcg: { at5: 0.75, at10: 0.75, atAll: 0.7 },
            precision: { at5: 1, at10: 1, atAll: 1 },
          },
          llmModel: 'gpt-4',
          llmProvider: 'openai',
          inputTokens: 100,
          outputTokens: 50,
        },
      ];

      // Save record using ADR-0002 hash-based pattern
      for (const record of records) {
        const hash = EvaluationHashUtil.generateCourseRetrievalRecordHash({
          question: record.question,
          skill: record.skill,
          testCaseId: record.testCaseId,
        });
        await service.saveRecord({
          testSetName,
          iterationNumber: 1,
          hash,
          record,
        });
      }

      await service.saveIterationMetrics({
        testSetName,
        iterationNumber: 1,
        records,
      });

      // Act
      const finalMetrics = await service.calculateFinalMetrics({
        testSetName,
        totalIterations,
      });

      // Assert - for single iteration, mean = min = max, stdDev = 0
      expect(finalMetrics.aggregateMetrics.ndcgAt10.mean).toBe(
        finalMetrics.aggregateMetrics.ndcgAt10.min,
      );
      expect(finalMetrics.aggregateMetrics.ndcgAt10.mean).toBe(
        finalMetrics.aggregateMetrics.ndcgAt10.max,
      );
      expect(finalMetrics.aggregateMetrics.ndcgAt10.stdDev).toBe(0);

      expect(finalMetrics.aggregateMetrics.precisionAt10.mean).toBe(
        finalMetrics.aggregateMetrics.precisionAt10.min,
      );
      expect(finalMetrics.aggregateMetrics.precisionAt10.stdDev).toBe(0);
    });

    it('should handle missing iterations gracefully', async () => {
      // Arrange
      const testSetName = 'test-missing-iterations';
      const totalIterations = 3;

      await service.ensureDirectoryStructure(testSetName);

      // Only create 2 out of 3 iterations using ADR-0002 hash-based pattern
      for (let i = 1; i <= 2; i++) {
        const records: EvaluateRetrieverOutput[] = [
          {
            testCaseId: `test-${i}`,
            question: `Question ${i}?`,
            skill: `Skill ${i}`,
            retrievedCount: 1,
            evaluations: [
              {
                subjectCode: 'CS101',
                subjectName: 'Course 1',
                relevanceScore: 2,
                reason: 'Good',
              },
            ],
            metrics: {
              totalCourses: 1,
              averageRelevance: 2,
              scoreDistribution: [],
              highlyRelevantCount: 0,
              highlyRelevantRate: 0,
              irrelevantCount: 0,
              irrelevantRate: 0,
              ndcg: { at5: 0.75, at10: 0.75, atAll: 0.75 },
              precision: { at5: 1, at10: 1, atAll: 1 },
            },
            llmModel: 'gpt-4',
            llmProvider: 'openai',
            inputTokens: 100,
            outputTokens: 50,
          },
        ];

        // Save each record using ADR-0002 hash-based pattern
        for (const record of records) {
          const hash = EvaluationHashUtil.generateCourseRetrievalRecordHash({
            question: record.question,
            skill: record.skill,
            testCaseId: record.testCaseId,
          });
          await service.saveRecord({
            testSetName,
            iterationNumber: i,
            hash,
            record,
          });
        }

        await service.saveIterationMetrics({
          testSetName,
          iterationNumber: i,
          records,
        });
      }

      // Act - should not throw, should aggregate available iterations
      const finalMetrics = await service.calculateFinalMetrics({
        testSetName,
        totalIterations,
      });

      // Assert - should have 2 iterations (missing iteration 3)
      expect(finalMetrics.perIterationMetrics).toHaveLength(2);
      // Both iterations have same data, so mean = max = min
      expect(finalMetrics.aggregateMetrics.ndcgAt10.mean).toBe(
        finalMetrics.aggregateMetrics.ndcgAt10.max,
      );
      expect(finalMetrics.aggregateMetrics.ndcgAt10.stdDev).toBe(0);
    });

    it('should throw error when no data found', async () => {
      // Arrange
      const testSetName = 'test-no-data';

      await service.ensureDirectoryStructure(testSetName);

      // Act & Assert
      await expect(
        service.calculateFinalMetrics({
          testSetName,
          totalIterations: 1,
        }),
      ).rejects.toThrow(
        `No data found for ${testSetName}. Cannot calculate final metrics.`,
      );
    });

    it('should correctly calculate statistical aggregates', async () => {
      // Arrange - Create data with different scores across iterations
      const testSetName = 'test-statistical-aggregates';
      const totalIterations = 3;

      await service.ensureDirectoryStructure(testSetName);

      // Create 3 iterations with varying numbers of highly relevant courses
      // This will create different NDCG/Precision values across iterations
      for (let i = 0; i < totalIterations; i++) {
        const records: EvaluateRetrieverOutput[] = [
          {
            testCaseId: `test-${i}`,
            question: `Question ${i}?`,
            skill: `Skill ${i}`,
            retrievedCount: 3,
            evaluations: [
              {
                subjectCode: 'CS101',
                subjectName: 'Course 1',
                relevanceScore: 3,
                reason: 'Excellent',
              },
              {
                subjectCode: 'CS102',
                subjectName: 'Course 2',
                relevanceScore: i === 2 ? 3 : 2, // Vary this score
                reason: 'Good',
              },
              {
                subjectCode: 'CS103',
                subjectName: 'Course 3',
                relevanceScore: 1,
                reason: 'Fair',
              },
            ],
            metrics: {
              totalCourses: 3,
              averageRelevance: (3 + (i === 2 ? 3 : 2) + 1) / 3,
              scoreDistribution: [],
              highlyRelevantCount: i === 2 ? 2 : 1,
              highlyRelevantRate: 0,
              irrelevantCount: 0,
              irrelevantRate: 0,
              ndcg: { at5: 0.8, at10: 0.8, atAll: 0.75 },
              precision: { at5: 0.67, at10: 0.67, atAll: 0.67 },
            },
            llmModel: 'gpt-4',
            llmProvider: 'openai',
            inputTokens: 100,
            outputTokens: 50,
          },
        ];

        // Save each record using ADR-0002 hash-based pattern
        for (const record of records) {
          const hash = EvaluationHashUtil.generateCourseRetrievalRecordHash({
            question: record.question,
            skill: record.skill,
            testCaseId: record.testCaseId,
          });
          await service.saveRecord({
            testSetName,
            iterationNumber: i + 1,
            hash,
            record,
          });
        }

        await service.saveIterationMetrics({
          testSetName,
          iterationNumber: i + 1,
          records,
        });
      }

      // Act
      const finalMetrics = await service.calculateFinalMetrics({
        testSetName,
        totalIterations,
      });

      // Assert - verify statistical structure is correct
      expect(finalMetrics.aggregateMetrics.ndcgAt10.mean).toBeGreaterThan(0);
      expect(finalMetrics.aggregateMetrics.ndcgAt10.min).toBeGreaterThanOrEqual(
        0,
      );
      expect(finalMetrics.aggregateMetrics.ndcgAt10.max).toBeLessThanOrEqual(1);
      expect(
        finalMetrics.aggregateMetrics.ndcgAt10.stdDev,
      ).toBeGreaterThanOrEqual(0);

      // Verify min <= mean <= max (using toBeCloseTo for floating-point precision)
      expect(finalMetrics.aggregateMetrics.ndcgAt10.min).toBeLessThanOrEqual(
        finalMetrics.aggregateMetrics.ndcgAt10.mean,
      );
      // Use toBeCloseTo for floating-point comparison (handles 0.8000000000000002 vs 0.8)
      expect(finalMetrics.aggregateMetrics.ndcgAt10.mean).toBeCloseTo(
        finalMetrics.aggregateMetrics.ndcgAt10.max,
        10, // 10 decimal places of precision
      );

      // Same checks for precision
      expect(finalMetrics.aggregateMetrics.precisionAt10.mean).toBeGreaterThan(
        0,
      );
      expect(
        finalMetrics.aggregateMetrics.precisionAt10.stdDev,
      ).toBeGreaterThanOrEqual(0);
    });
  });
});
