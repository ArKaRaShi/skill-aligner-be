import { Test, TestingModule } from '@nestjs/testing';

import * as os from 'node:os';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';
import type { TokenCostEstimateSummary } from 'src/shared/utils/token-cost-calculator.helper';

import {
  createMockCourseInfo,
  createMockEvaluationItem,
  createMockRetrievalPerformanceMetrics,
} from 'src/modules/evaluator/course-retrieval/__tests__/course-retrieval.fixture';
import { CourseRetrieverEvaluator } from 'src/modules/evaluator/course-retrieval/evaluators/course-retriever.evaluator';
import { CourseRetrievalResultManagerService } from 'src/modules/evaluator/course-retrieval/services/course-retrieval-result-manager.service';
import { CourseRetrievalRunnerService } from 'src/modules/evaluator/course-retrieval/services/course-retrieval-runner.service';
import type {
  CourseRetrievalProgressFile,
  CourseRetrieverTestCase,
  CourseRetrieverTestSet,
} from 'src/modules/evaluator/course-retrieval/types/course-retrieval.types';
import {
  createMockLlmInfo,
  createMockTokenUsage,
} from 'src/modules/evaluator/shared/services/__tests__/test-set-builder.fixture';

// ============================================================================
// TEST HELPERS
// ============================================================================

const getTempDir = () => path.join(os.tmpdir(), `runner-test-${Date.now()}`);

const createTestCase = (id: string): CourseRetrieverTestCase => ({
  id: `test-case-${id}`,
  question: `Question ${id}?`,
  skill: `Skill ${id}`,
  retrievedCourses: [
    createMockCourseInfo({
      subjectCode: `CS${id}`,
      subjectName: `Course ${id}`,
    }),
  ],
});

const createTestSet = (
  name: string,
  caseCount: number,
): CourseRetrieverTestSet => ({
  version: 1,
  name,
  description: `Test set ${name}`,
  cases: Array.from({ length: caseCount }, (_, i) =>
    createTestCase(String(i + 1)),
  ),
});

const createMockTokenCostEstimateSummary = (): TokenCostEstimateSummary => ({
  totalEstimatedCost: 0.001,
  details: [
    {
      model: 'gpt-4',
      inputTokens: 100,
      outputTokens: 50,
      available: true,
      estimatedCost: 0.001,
    },
  ],
});

const createMockEvaluatorOutput = (question: string, skill: string) => ({
  question,
  skill,
  evaluations: [createMockEvaluationItem()],
  metrics: createMockRetrievalPerformanceMetrics(),
  llmInfo: createMockLlmInfo(),
  llmTokenUsage: createMockTokenUsage(),
  llmCostEstimateSummary: createMockTokenCostEstimateSummary(),
});

// ============================================================================
// TEST SUITE
// ============================================================================

describe('CourseRetrievalRunnerService - Crash Recovery Integration', () => {
  let service: CourseRetrievalRunnerService;
  let judgeEvaluator: CourseRetrieverEvaluator;
  let tempDir: string;

  beforeAll(() => {
    tempDir = getTempDir();
  });

  beforeEach(async () => {
    // Create mock evaluator
    const mockJudgeEvaluator = {
      evaluate: jest
        .fn()
        .mockImplementation(({ question, skill }) =>
          Promise.resolve(createMockEvaluatorOutput(question, skill)),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseRetrievalRunnerService,
        CourseRetrievalResultManagerService,
        {
          provide: CourseRetrieverEvaluator,
          useValue: mockJudgeEvaluator,
        },
      ],
    })
      .overrideProvider(CourseRetrievalResultManagerService)
      .useFactory({
        factory: () => {
          return new CourseRetrievalResultManagerService(tempDir);
        },
      })
      .overrideProvider(CourseRetrievalRunnerService)
      .useFactory({
        factory: (resultManager) => {
          return new CourseRetrievalRunnerService(
            mockJudgeEvaluator as unknown as CourseRetrieverEvaluator,
            resultManager,
            tempDir,
          );
        },
        inject: [CourseRetrievalResultManagerService],
      })
      .compile();

    service = module.get<CourseRetrievalRunnerService>(
      CourseRetrievalRunnerService,
    );
    judgeEvaluator = module.get<CourseRetrieverEvaluator>(
      CourseRetrieverEvaluator,
    );
  });

  afterEach(async () => {
    // Clean up temp directory
    await FileHelper.deleteDirectory(tempDir);
  });

  describe('Progress tracking - file creation', () => {
    it('should create progress file with correct structure', async () => {
      // Arrange
      const testSet = createTestSet('test-crash', 3);
      const iterationNumber = 1;

      // Act
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - verify progress file exists with correct structure
      const progressPath = path.join(
        tempDir,
        'test-crash',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );

      const progress =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);

      expect(progress.testSetName).toBe('test-crash');
      expect(progress.iterationNumber).toBe(1);
      expect(progress.statistics.totalItems).toBe(3);
      expect(progress.statistics.completedItems).toBe(3);
      expect(progress.statistics.completionPercentage).toBe(100);
      expect(progress.entries).toHaveLength(3);

      // Verify hash format (64 hex characters)
      progress.entries.forEach((entry) => {
        expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(entry.dedupeKey).toBeDefined();
        expect(entry.skill).toBeDefined();
        expect(entry.testCases).toBeDefined();
        expect(Array.isArray(entry.testCases)).toBe(true);
        expect(entry.completedAt).toBeDefined();
        expect(entry.result).toBeDefined();
      });
    });

    it('should save progress after each chunk (crash recovery)', async () => {
      // Arrange
      const testSet = createTestSet('test-crash', 6);
      const iterationNumber = 1;

      let callCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          callCount++;
          // With chunked concurrency (c=3), fail chunk 1 (first 3 groups)
          // All 3 run in parallel, errors are isolated
          if (callCount <= 3) {
            throw new Error('Simulated crash in chunk 1');
          }
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      // Act & Assert - with Promise.allSettled, errors don't propagate
      // The run completes but with some groups failed
      await service.runTestSet({ testSet, iterationNumber });

      // Verify progress: only groups that succeeded are saved (chunk 2)
      const progressPath = path.join(
        tempDir,
        'test-crash',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );

      const progress =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);

      // Chunk 1 failed (all 3 groups), Chunk 2 succeeded (3 groups)
      expect(progress.entries).toHaveLength(3);
      expect(progress.statistics.completedItems).toBe(3);
    });
  });

  describe('Crash recovery - skip completed samples', () => {
    it('should skip already completed samples when resuming', async () => {
      // Arrange
      const testSet = createTestSet('test-resume', 3);
      const iterationNumber = 1;

      // First run: let only 2 complete (3rd fails)
      let firstRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          firstRunCount++;
          if (firstRunCount === 3) {
            throw new Error('Group 3 failed');
          }
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      // Run completes despite error (isolated)
      await service.runTestSet({ testSet, iterationNumber });
      expect(firstRunCount).toBe(3); // All 3 attempted

      // Verify progress has 2 entries (group 3 failed)
      const progressPath = path.join(
        tempDir,
        'test-resume',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );

      const progressAfterFirstRun =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);
      expect(progressAfterFirstRun.entries).toHaveLength(2);

      // Reset mock for resume - now group 3 succeeds
      let secondRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          secondRunCount++;
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      // Act - resume (group 3 should succeed this time)
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - should only call evaluate once (for the 3rd sample)
      expect(secondRunCount).toBe(1);

      // Verify final progress has all 3
      const progressAfterResume =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);
      expect(progressAfterResume.entries).toHaveLength(3);
    });

    it('should skip all samples if already completed', async () => {
      // Arrange
      const testSet = createTestSet('test-resume', 2);
      const iterationNumber = 1;

      // First run: complete all
      await service.runTestSet({ testSet, iterationNumber });

      // Clear mock to track calls
      (judgeEvaluator.evaluate as jest.Mock).mockClear();

      // Act - run again
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - evaluate should not be called
      expect(judgeEvaluator.evaluate).not.toHaveBeenCalled();
    });
  });

  describe('Result aggregation - cached + new', () => {
    it('should combine cached results with new evaluations', async () => {
      // Arrange
      const testSet = createTestSet('test-aggregate', 6);
      const iterationNumber = 1;

      // First run: first chunk (3 groups) succeeds, second chunk fails
      let firstRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          firstRunCount++;
          // Fail groups in chunk 2 (groups 4, 5, 6)
          if (firstRunCount > 3) {
            throw new Error('Chunk 2 failed');
          }
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      // Run completes but chunk 2 fails
      await service.runTestSet({ testSet, iterationNumber });
      expect(firstRunCount).toBeGreaterThan(3);

      // Verify only chunk 1 saved
      const progressPath = path.join(
        tempDir,
        'test-aggregate',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );
      const progressAfterFirstRun =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);
      expect(progressAfterFirstRun.entries).toHaveLength(3);

      // Resume and complete remaining groups
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) =>
          Promise.resolve(createMockEvaluatorOutput(question, skill)),
      );

      // Act - resume
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - verify records file has all 6 results
      const recordsPath = path.join(
        tempDir,
        'test-aggregate',
        'records',
        `records-iteration-${iterationNumber}.json`,
      );

      const records = await FileHelper.loadJson<unknown[]>(recordsPath);

      expect(records).toHaveLength(6);

      // Verify all questions are present
      const questions = records.map(
        (r) => (r as { question: string }).question,
      );
      expect(questions).toEqual([
        'Question 1?',
        'Question 2?',
        'Question 3?',
        'Question 4?',
        'Question 5?',
        'Question 6?',
      ]);
    });
  });

  describe('Hash-based uniqueness', () => {
    it('should generate unique hashes for each sample', async () => {
      // Arrange
      const testSet = createTestSet('test-hash', 3);
      const iterationNumber = 1;

      // Act
      await service.runTestSet({ testSet, iterationNumber });

      // Assert
      const progressPath = path.join(
        tempDir,
        'test-hash',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );

      const progress =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);

      const hashes = progress.entries.map((e) => e.hash);

      // All hashes should be unique
      expect(new Set(hashes).size).toBe(3);

      // All hashes should be valid SHA256 (64 hex characters)
      hashes.forEach((hash) => {
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    it('should generate consistent hash for same input', async () => {
      // Arrange
      const testSet1 = createTestSet('test-hash', 2);
      const testSet2 = createTestSet('test-hash', 2);

      // Act
      await service.runTestSet({ testSet: testSet1, iterationNumber: 1 });
      await service.runTestSet({ testSet: testSet2, iterationNumber: 2 });

      // Assert - hashes should be the same across iterations
      const progressPath1 = path.join(
        tempDir,
        'test-hash',
        'progress',
        'progress-iteration-1.json',
      );
      const progressPath2 = path.join(
        tempDir,
        'test-hash',
        'progress',
        'progress-iteration-2.json',
      );

      const progress1 =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath1);
      const progress2 =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath2);

      const hashes1 = progress1.entries.map((e) => e.hash);
      const hashes2 = progress2.entries.map((e) => e.hash);

      expect(hashes1).toEqual(hashes2);
    });
  });

  describe('Parallel execution - chunked concurrency', () => {
    it('should process multiple groups in parallel within a chunk', async () => {
      // Arrange - create 6 test cases (will be grouped by skill+courses)
      const testSet = createTestSet('test-parallel', 6);
      const iterationNumber = 1;

      const evaluateCalls: Array<{ question: string; skill: string }> = [];

      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          evaluateCalls.push({ question, skill });

          // Simulate some delay to verify parallel execution
          return new Promise((resolve) => {
            setTimeout(
              () => resolve(createMockEvaluatorOutput(question, skill)),
              50, // 50ms delay
            );
          });
        },
      );

      // Act
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - verify all groups were evaluated
      expect(evaluateCalls).toHaveLength(6);

      // Verify progress file has correct structure
      const progressPath = path.join(
        tempDir,
        'test-parallel',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );
      const progress =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);

      expect(progress.entries).toHaveLength(6);
      expect(progress.deduplicationStats?.uniqueGroups).toBe(6);
    });

    it('should save progress once per chunk (not per group)', async () => {
      // Arrange - create 5 test cases (2 chunks: 3 + 2)
      const testSet = createTestSet('test-chunk-progress', 5);
      const iterationNumber = 1;

      // Track progress saves by mocking saveProgress on resultManager instance
      const resultManager = service['resultManager'];
      const originalSaveProgress =
        resultManager.saveProgress.bind(resultManager);
      let progressSaveCount = 0;

      resultManager.saveProgress = function (progress) {
        progressSaveCount++;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return originalSaveProgress(progress);
      };

      // Act
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - with default concurrency=3:
      // Chunk 1: 3 groups → 1 progress save
      // Chunk 2: 2 groups → 1 progress save
      // Plus initial load and final saves
      // Should be 2-4 saves (depending on implementation), NOT 5 (one per group)
      expect(progressSaveCount).toBeLessThanOrEqual(4);
      expect(progressSaveCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle one group failing without affecting others in chunk', async () => {
      // Arrange - create 6 test cases
      const testSet = createTestSet('test-failure', 6);
      const iterationNumber = 1;

      let callCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          callCount++;
          // Fail the 2nd call (in chunk 1)
          if (callCount === 2) {
            return Promise.reject(new Error('Group 2 failed'));
          }
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      // Act - should NOT throw, errors are isolated per group
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - all other groups should have been evaluated
      expect(callCount).toBeGreaterThan(2); // More than just the failed one

      // Verify progress has 5 entries (1 failed, 5 succeeded)
      const progressPath = path.join(
        tempDir,
        'test-failure',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );
      const progress =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);

      expect(progress.entries).toHaveLength(5);
    });

    it('should handle mixed completed and pending groups in same chunk', async () => {
      // Arrange - create 6 test cases
      const testSet = createTestSet('test-mixed', 6);
      const iterationNumber = 1;

      // First run: complete first 3 groups
      let firstRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          firstRunCount++;
          // Fail the remaining groups (4, 5, 6)
          if (firstRunCount > 3) {
            throw new Error('Stop after 3');
          }
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      // Run completes despite error
      await service.runTestSet({ testSet, iterationNumber });
      expect(firstRunCount).toBe(6); // All 6 attempted

      // Verify first 3 succeeded, last 3 failed
      const progressPath = path.join(
        tempDir,
        'test-mixed',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );
      const progressAfterFirstRun =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);
      expect(progressAfterFirstRun.entries).toHaveLength(3);

      // Second run: should complete remaining 3
      let secondRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          secondRunCount++;
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      // Act
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - only 3 new evaluations (groups 4, 5, 6)
      expect(secondRunCount).toBe(3);

      // Verify final progress
      const progressAfterResume =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);

      expect(progressAfterResume.entries).toHaveLength(6);
    });

    it('should handle single group (edge case for concurrency)', async () => {
      // Arrange - create 1 test case
      const testSet = createTestSet('test-single', 1);
      const iterationNumber = 1;

      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) =>
          Promise.resolve(createMockEvaluatorOutput(question, skill)),
      );

      // Act
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - should complete successfully
      expect(judgeEvaluator.evaluate).toHaveBeenCalledTimes(1);

      const progressPath = path.join(
        tempDir,
        'test-single',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );
      const progress =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);

      expect(progress.entries).toHaveLength(1);
    });

    it('should verify progress file integrity with concurrent writes', async () => {
      // Arrange - create 10 test cases (4 chunks with concurrency=3)
      const testSet = createTestSet('test-integrity', 10);
      const iterationNumber = 1;

      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          // Add small random delay to increase chance of race conditions
          const delay = Math.random() * 20;
          return new Promise((resolve) => {
            setTimeout(
              () => resolve(createMockEvaluatorOutput(question, skill)),
              delay,
            );
          });
        },
      );

      // Act
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - verify progress file is valid JSON and has correct structure
      const progressPath = path.join(
        tempDir,
        'test-integrity',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );

      // File should exist and be loadable
      const progress =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);

      // Verify structure
      expect(progress.testSetName).toBe('test-integrity');
      expect(progress.iterationNumber).toBe(1);
      expect(progress.entries).toHaveLength(10);

      // Verify all entries have required fields
      progress.entries.forEach((entry) => {
        expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(entry.dedupeKey).toBeDefined();
        expect(entry.skill).toBeDefined();
        expect(entry.testCases).toBeDefined();
        expect(entry.completedAt).toBeDefined();
        expect(entry.result).toBeDefined();
      });

      // Verify no duplicate hashes
      const hashes = progress.entries.map((e) => e.hash);
      expect(new Set(hashes).size).toBe(10);
    });
  });
});
