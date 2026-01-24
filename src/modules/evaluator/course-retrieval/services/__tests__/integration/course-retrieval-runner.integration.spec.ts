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
        expect(entry.question).toBeDefined();
        expect(entry.skill).toBeDefined();
        expect(entry.testCaseId).toBeDefined();
        expect(entry.completedAt).toBeDefined();
        expect(entry.result).toBeDefined();
      });
    });

    it('should save progress after each sample (crash recovery)', async () => {
      // Arrange
      const testSet = createTestSet('test-crash', 3);
      const iterationNumber = 1;

      let callCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Simulated crash');
          }
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      // Act & Assert
      await expect(
        service.runTestSet({ testSet, iterationNumber }),
      ).rejects.toThrow('Simulated crash');

      // Verify progress was saved after first sample before crash
      const progressPath = path.join(
        tempDir,
        'test-crash',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );

      const progress =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);

      expect(progress.entries).toHaveLength(1);
      expect(progress.statistics.completedItems).toBe(1);
      expect(progress.statistics.completionPercentage).toBeCloseTo(33.33, 1);
    });
  });

  describe('Crash recovery - skip completed samples', () => {
    it('should skip already completed samples when resuming', async () => {
      // Arrange
      const testSet = createTestSet('test-resume', 3);
      const iterationNumber = 1;

      // First run: crash after 2 samples
      let firstRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          firstRunCount++;
          if (firstRunCount === 3) {
            throw new Error('Crash');
          }
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      await expect(
        service.runTestSet({ testSet, iterationNumber }),
      ).rejects.toThrow('Crash');
      expect(firstRunCount).toBe(3); // 2 successful, 3rd threw

      // Verify progress has 2 entries
      const progressPath = path.join(
        tempDir,
        'test-resume',
        'progress',
        `progress-iteration-${iterationNumber}.json`,
      );

      const progressAfterCrash =
        await FileHelper.loadJson<CourseRetrievalProgressFile>(progressPath);
      expect(progressAfterCrash.entries).toHaveLength(2);

      // Reset mock for resume
      let secondRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          secondRunCount++;
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      // Act - resume
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
      const testSet = createTestSet('test-aggregate', 4);
      const iterationNumber = 1;

      // First run: crash after 2
      let firstRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) => {
          firstRunCount++;
          if (firstRunCount === 3) {
            throw new Error('Crash');
          }
          return Promise.resolve(createMockEvaluatorOutput(question, skill));
        },
      );

      await expect(
        service.runTestSet({ testSet, iterationNumber }),
      ).rejects.toThrow('Crash');

      // Resume and complete
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(
        ({ question, skill }) =>
          Promise.resolve(createMockEvaluatorOutput(question, skill)),
      );

      // Act
      await service.runTestSet({ testSet, iterationNumber });

      // Assert - verify records file has all 4 results
      const recordsPath = path.join(
        tempDir,
        'test-aggregate',
        'records',
        `records-iteration-${iterationNumber}.json`,
      );

      const records = await FileHelper.loadJson<unknown[]>(recordsPath);

      expect(records).toHaveLength(4);

      // Verify all questions are present
      const questions = records.map(
        (r) => (r as { question: string }).question,
      );
      expect(questions).toEqual([
        'Question 1?',
        'Question 2?',
        'Question 3?',
        'Question 4?',
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
});
