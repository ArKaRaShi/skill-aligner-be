import { Test, TestingModule } from '@nestjs/testing';

import * as os from 'node:os';
import * as path from 'node:path';
import type { Identifier } from 'src/shared/contracts/types/identifier';
import { FileHelper } from 'src/shared/utils/file';

import { AnswerSynthesisJudgeEvaluator } from '../../../evaluators/answer-synthesis-judge.evaluator';
import { AnswerSynthesisComparisonService } from '../../../services/answer-synthesis-comparison.service';
import { AnswerSynthesisLowFaithfulnessAnalyzerService } from '../../../services/answer-synthesis-low-faithfulness-analyzer.service';
import { AnswerSynthesisMetricsCalculator } from '../../../services/answer-synthesis-metrics-calculator.service';
import { AnswerSynthesisResultManagerService } from '../../../services/answer-synthesis-result-manager.service';
import { AnswerSynthesisRunnerService } from '../../../services/answer-synthesis-runner.service';
import type {
  AnswerSynthesisComparisonRecord,
  AnswerSynthesisEvaluationConfig,
  AnswerSynthesisMetricsFile,
  AnswerSynthesisProgressFile,
  AnswerSynthesisTestCase,
} from '../../../types/answer-synthesis.types';

// Helper to create temp directory
const getTempDir = () =>
  path.join(os.tmpdir(), `answer-synthesis-runner-test-${Date.now()}`);

describe('AnswerSynthesisRunnerService Integration', () => {
  let service: AnswerSynthesisRunnerService;
  // Unused but kept for test setup clarity
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let resultManager: AnswerSynthesisResultManagerService;
  let judgeEvaluator: AnswerSynthesisJudgeEvaluator;
  let tempDir: string;

  // Test data factories
  const createTestCase = (queryLogId: string): AnswerSynthesisTestCase => ({
    queryLogId,
    question: `Question for ${queryLogId}?`,
    answer: `System answer for ${queryLogId}`,
    context: [
      {
        id: `course-${queryLogId}` as Identifier,
        campusId: 'campus-1' as Identifier,
        facultyId: 'faculty-1' as Identifier,
        subjectCode: 'CS',
        subjectName: 'Computer Science',
        isGenEd: false,
        courseLearningOutcomes: [],
        courseOfferings: [],
        courseClickLogs: [],
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        matchedSkills: [],
        maxRelevanceScore: 5,
      },
    ],
    duration: 1000,
  });

  const createJudgeResult = (_queryLogId: string) => ({
    verdict: {
      faithfulness: { score: 5 as const, reasoning: 'Fully supported' },
      completeness: { score: 4 as const, reasoning: 'Good explanation' },
    },
    tokenUsage: [
      {
        model: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
      },
    ],
  });

  const createConfig = (
    outputDirectory: string,
  ): AnswerSynthesisEvaluationConfig => ({
    outputDirectory,
    judgeModel: 'gpt-4o-mini',
    judgeProvider: 'openai',
    iterations: 1,
    systemPromptVersion: 'v1',
  });

  beforeAll(() => {
    tempDir = getTempDir();
  });

  beforeEach(async () => {
    // Create mock evaluator
    const mockJudgeEvaluator = {
      evaluate: jest.fn().mockResolvedValue(createJudgeResult('mock')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnswerSynthesisRunnerService,
        AnswerSynthesisResultManagerService,
        AnswerSynthesisMetricsCalculator,
        AnswerSynthesisComparisonService,
        AnswerSynthesisLowFaithfulnessAnalyzerService,
        {
          provide: AnswerSynthesisJudgeEvaluator,
          useValue: mockJudgeEvaluator,
        },
      ],
    })
      .overrideProvider(AnswerSynthesisResultManagerService)
      .useFactory({
        factory: (metricsCalc) => {
          return new AnswerSynthesisResultManagerService(metricsCalc, tempDir);
        },
        inject: [AnswerSynthesisMetricsCalculator],
      })
      .overrideProvider(AnswerSynthesisRunnerService)
      .useFactory({
        factory: (resultMgr, comparison, lowFaith) => {
          return new AnswerSynthesisRunnerService(
            mockJudgeEvaluator as any,
            comparison,
            lowFaith,
            resultMgr,
            tempDir,
          );
        },
        inject: [
          AnswerSynthesisResultManagerService,
          AnswerSynthesisComparisonService,
          AnswerSynthesisLowFaithfulnessAnalyzerService,
        ],
      })
      .compile();

    service = module.get<AnswerSynthesisRunnerService>(
      AnswerSynthesisRunnerService,
    );
    resultManager = module.get<AnswerSynthesisResultManagerService>(
      AnswerSynthesisResultManagerService,
    );
    judgeEvaluator = module.get<AnswerSynthesisJudgeEvaluator>(
      AnswerSynthesisJudgeEvaluator,
    );
  });

  afterEach(async () => {
    // Clean up temp directory
    await FileHelper.deleteDirectory(tempDir);
  });

  describe('Progress file creation from empty state', () => {
    it('should create progress file with correct structure when none exists', async () => {
      // Arrange
      const testSetName = 'test-set-empty';
      const testCases = [
        createTestCase('ql-1'),
        createTestCase('ql-2'),
        createTestCase('ql-3'),
      ];
      const config = createConfig(testSetName);

      // Act
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - verify progress file exists with correct structure
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );

      const progress =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);

      expect(progress.testSetName).toBe(testSetName);
      expect(progress.iterationNumber).toBe(1);
      expect(progress.statistics.totalQuestions).toBe(3);
      expect(progress.statistics.completedQuestions).toBe(3);
      expect(progress.statistics.pendingQuestions).toBe(0);
      expect(progress.statistics.completionPercentage).toBe(100);
      expect(progress.entries).toHaveLength(3);
      expect(progress.entries[0]).toMatchObject({
        queryLogId: 'ql-1',
        result: {
          faithfulnessScore: 5,
          completenessScore: 4,
          passed: true,
        },
      });
    });

    it('should create progress file in correct directory structure', async () => {
      // Arrange
      const testSetName = 'test-set-structure';
      const testCases = [createTestCase('ql-1')];
      const config = createConfig(testSetName);

      // Act
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - verify directory structure
      const progressDir = path.join(tempDir, testSetName, 'iteration-1');
      const progressPath = path.join(progressDir, '.progress.json');

      const exists = FileHelper.exists(progressPath);
      expect(exists).toBe(true);
    });
  });

  describe('Progress incremental saving (after each chunk)', () => {
    it('should save progress after every chunk', async () => {
      // Arrange
      const testSetName = 'test-set-incremental';
      const testCases = Array.from({ length: 12 }, (_, i) =>
        createTestCase(`ql-${i + 1}`),
      );
      const config = createConfig(testSetName);

      // Act
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - verify progress was saved after each chunk
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );

      const progress =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);

      // All 12 samples should be marked as completed
      expect(progress.statistics.completedQuestions).toBe(12);
      expect(progress.statistics.completionPercentage).toBe(100);
      expect(progress.entries).toHaveLength(12);
    });

    it('should update completion percentage correctly during incremental saves', async () => {
      // Arrange
      const testSetName = 'test-set-percentage';
      const testCases = Array.from({ length: 10 }, (_, i) =>
        createTestCase(`ql-${i + 1}`),
      );
      const config = createConfig(testSetName);

      // Act
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - verify final completion percentage
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );

      const progress =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);

      expect(progress.statistics.completionPercentage).toBe(100);
    });
  });

  describe('Parallel execution - chunked concurrency', () => {
    it('should process multiple questions in parallel within a chunk', async () => {
      // Arrange - create 12 test cases (3 chunks with concurrency=4)
      const testSetName = 'test-parallel';
      const testCases = Array.from({ length: 12 }, (_, i) =>
        createTestCase(`ql-${i + 1}`),
      );
      const config = createConfig(testSetName);

      // Track evaluate calls
      const evaluateCalls: string[] = [];
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation((testCase) => {
        evaluateCalls.push(testCase.queryLogId);
        return Promise.resolve(createJudgeResult(testCase.queryLogId));
      });

      // Act
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - verify all questions were evaluated
      expect(evaluateCalls).toHaveLength(12);
      expect(evaluateCalls).toEqual([
        'ql-1',
        'ql-2',
        'ql-3',
        'ql-4',
        'ql-5',
        'ql-6',
        'ql-7',
        'ql-8',
        'ql-9',
        'ql-10',
        'ql-11',
        'ql-12',
      ]);

      // Verify progress file has correct structure
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );
      const progress =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);

      expect(progress.entries).toHaveLength(12);
      expect(progress.statistics.completedQuestions).toBe(12);
    });

    it('should save progress once per chunk (not per question)', async () => {
      // Arrange - create 8 test cases (2 chunks: 4 + 4)
      const testSetName = 'test-chunk-progress';
      const testCases = Array.from({ length: 8 }, (_, i) =>
        createTestCase(`ql-${i + 1}`),
      );
      const config = createConfig(testSetName);

      // Track progress saves by mocking saveProgress on service instance
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const originalSaveProgress = (service as any).saveProgress.bind(service);
      let progressSaveCount = 0;

      (service as any).saveProgress = function (...args: unknown[]) {
        progressSaveCount++;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return originalSaveProgress(...args);
      };

      // Act
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - with concurrency=4:
      // Chunk 1: 4 questions → 1 progress save
      // Chunk 2: 4 questions → 1 progress save
      // Plus initial load and final saves
      // Should be 2-4 saves (depending on implementation), NOT 8 (one per question)
      expect(progressSaveCount).toBeLessThanOrEqual(4);
      expect(progressSaveCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle one question failing without affecting others in chunk', async () => {
      // Arrange - create 8 test cases
      const testSetName = 'test-failure';
      const testCases = Array.from({ length: 8 }, (_, i) =>
        createTestCase(`ql-${i + 1}`),
      );
      const config = createConfig(testSetName);

      let callCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation((testCase) => {
        callCount++;
        // Fail the 2nd call (in chunk 1)
        if (callCount === 2) {
          return Promise.reject(new Error('Question 2 failed'));
        }
        return Promise.resolve(createJudgeResult(testCase.queryLogId));
      });

      // Act - should NOT throw, errors are isolated per question
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - all other questions should have been evaluated
      expect(callCount).toBeGreaterThan(2); // More than just the failed one

      // Verify progress has 7 entries (1 failed, 7 succeeded)
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );
      const progress =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);

      expect(progress.entries).toHaveLength(7);
    });

    it('should handle mixed completed and pending questions in same chunk', async () => {
      // Arrange - create 8 test cases
      const testSetName = 'test-mixed';
      const testCases = Array.from({ length: 8 }, (_, i) =>
        createTestCase(`ql-${i + 1}`),
      );
      const config = createConfig(testSetName);

      // First run: complete first 4 questions (chunk 1)
      let firstRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation((testCase) => {
        firstRunCount++;
        // Fail the remaining questions (5-8)
        if (firstRunCount > 4) {
          throw new Error('Stop after 4');
        }
        return Promise.resolve(createJudgeResult(testCase.queryLogId));
      });

      // Run completes despite error
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });
      expect(firstRunCount).toBe(8); // All 8 attempted

      // Verify first 4 succeeded, last 4 failed
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );
      const progressAfterFirstRun =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);
      expect(progressAfterFirstRun.entries).toHaveLength(4);

      // Second run: should complete remaining 4
      let secondRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation((testCase) => {
        secondRunCount++;
        return Promise.resolve(createJudgeResult(testCase.queryLogId));
      });

      // Act
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - only 4 new evaluations (questions 5-8)
      expect(secondRunCount).toBe(4);

      // Verify final progress
      const progressAfterResume =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);

      expect(progressAfterResume.entries).toHaveLength(8);
    });

    it('should handle single question (edge case for concurrency)', async () => {
      // Arrange - create 1 test case
      const testSetName = 'test-single';
      const testCases = [createTestCase('ql-1')];
      const config = createConfig(testSetName);

      (judgeEvaluator.evaluate as jest.Mock).mockImplementation((testCase) =>
        Promise.resolve(createJudgeResult(testCase.queryLogId)),
      );

      // Act
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - should complete successfully
      expect(judgeEvaluator.evaluate).toHaveBeenCalledTimes(1);

      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );
      const progress =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);

      expect(progress.entries).toHaveLength(1);
    });

    it('should verify progress file integrity with concurrent writes', async () => {
      // Arrange - create 16 test cases (4 chunks with concurrency=4)
      const testSetName = 'test-integrity';
      const testCases = Array.from({ length: 16 }, (_, i) =>
        createTestCase(`ql-${i + 1}`),
      );
      const config = createConfig(testSetName);

      (judgeEvaluator.evaluate as jest.Mock).mockImplementation((testCase) => {
        // Add small random delay to increase chance of race conditions
        const delay = Math.random() * 20;
        return new Promise((resolve) => {
          setTimeout(
            () => resolve(createJudgeResult(testCase.queryLogId)),
            delay,
          );
        });
      });

      // Act
      await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - verify progress file is valid JSON and has correct structure
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );

      // File should exist and be loadable
      const progress =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);

      // Verify structure
      expect(progress.testSetName).toBe('test-integrity');
      expect(progress.iterationNumber).toBe(1);
      expect(progress.entries).toHaveLength(16);

      // Verify all entries have required fields
      progress.entries.forEach((entry) => {
        expect(entry.hash).toBeDefined();
        expect(entry.queryLogId).toBeDefined();
        expect(entry.question).toBeDefined();
        expect(entry.completedAt).toBeDefined();
        expect(entry.result).toBeDefined();
        expect(entry.result.faithfulnessScore).toBeGreaterThanOrEqual(1);
        expect(entry.result.faithfulnessScore).toBeLessThanOrEqual(5);
        expect(entry.result.completenessScore).toBeGreaterThanOrEqual(1);
        expect(entry.result.completenessScore).toBeLessThanOrEqual(5);
        expect(typeof entry.result.passed).toBe('boolean');
      });

      // Verify no duplicate queryLogIds
      const queryLogIds = progress.entries.map((e) => e.queryLogId);
      expect(new Set(queryLogIds).size).toBe(16);
    });
  });

  describe('Resume from partial progress (skip completed samples)', () => {
    it('should skip already completed samples when resuming', async () => {
      // Arrange
      const testSetName = 'test-set-resume';
      const allTestCases = [
        createTestCase('ql-1'),
        createTestCase('ql-2'),
        createTestCase('ql-3'),
        createTestCase('ql-4'),
      ];
      const config = createConfig(testSetName);

      // First run: complete first 2 (chunk 1), fail rest
      let firstRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation((testCase) => {
        firstRunCount++;
        // Fail questions 3-4
        if (firstRunCount > 2) {
          throw new Error('Questions 3-4 failed');
        }
        return Promise.resolve(createJudgeResult(testCase.queryLogId));
      });

      // Run completes despite error (errors are isolated with Promise.allSettled)
      await service.runIteration({
        iterationNumber: 1,
        testCases: allTestCases,
        config,
      });

      expect(firstRunCount).toBe(4); // All 4 attempted

      // Verify progress file shows 2 completed
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );
      const progressAfterFirstRun =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);
      expect(progressAfterFirstRun.statistics.completedQuestions).toBe(2);

      // Note: With Promise.allSettled, the run completes even with failures,
      // so the records file IS created (with the successful questions)
      const recordsPath = path.join(
        tempDir,
        testSetName,
        'records',
        'records-iteration-1.json',
      );
      const recordsExist = FileHelper.exists(recordsPath);
      expect(recordsExist).toBe(true);

      // Verify it has the 2 successful records
      const records =
        await FileHelper.loadJson<AnswerSynthesisComparisonRecord[]>(
          recordsPath,
        );
      expect(records).toHaveLength(2);

      // Reset mock for second run
      let secondRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation((testCase) => {
        secondRunCount++;
        return Promise.resolve(createJudgeResult(testCase.queryLogId));
      });

      // Act - resume iteration (should skip the 2 completed samples)
      const result = await service.runIteration({
        iterationNumber: 1,
        testCases: allTestCases,
        config,
      });

      // Assert - should only evaluate 2 new samples (ql-3, ql-4)
      expect(secondRunCount).toBe(2); // Only 2 new samples evaluated
      // Result includes both existing (2) and new (2) records = 4 total
      expect(result).toHaveLength(4);

      const queryLogIds = result.map((r) => r.queryLogId).sort();
      expect(queryLogIds).toEqual(['ql-1', 'ql-2', 'ql-3', 'ql-4']);
    });

    it('should load and return existing results when all samples already completed', async () => {
      // Arrange
      const testSetName = 'test-set-already-done';
      const testCases = [
        createTestCase('ql-1'),
        createTestCase('ql-2'),
        createTestCase('ql-3'),
      ];
      const config = createConfig(testSetName);

      // First run: complete all samples
      const firstRunResult = await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      expect(firstRunResult).toHaveLength(3);

      // Verify progress file has all 3 entries
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );
      const progressAfterFirstRun =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);
      expect(progressAfterFirstRun.entries).toHaveLength(3);

      // Verify records file exists
      const recordsPath = path.join(
        tempDir,
        testSetName,
        'records',
        'records-iteration-1.json',
      );
      const firstRunRecords =
        await FileHelper.loadJson<AnswerSynthesisComparisonRecord[]>(
          recordsPath,
        );
      expect(firstRunRecords).toHaveLength(3);

      // Act - run again (should load existing results)
      const secondRunResult = await service.runIteration({
        iterationNumber: 1,
        testCases,
        config,
      });

      // Assert - should return same results without re-evaluating
      expect(secondRunResult).toHaveLength(3);
      expect(secondRunResult[0].queryLogId).toBe(firstRunRecords[0].queryLogId);
    });
  });

  describe('Result aggregation (existing + new = complete)', () => {
    it('should combine existing records with new records correctly', async () => {
      // Arrange
      const testSetName = 'test-set-aggregate';
      const allTestCases = [
        createTestCase('ql-1'),
        createTestCase('ql-2'),
        createTestCase('ql-3'),
        createTestCase('ql-4'),
      ];
      const config = createConfig(testSetName);

      // First run: complete all samples successfully
      await service.runIteration({
        iterationNumber: 1,
        testCases: allTestCases,
        config,
      });

      // Verify 4 records were saved
      const recordsPath = path.join(
        tempDir,
        testSetName,
        'records',
        'records-iteration-1.json',
      );
      const firstRunRecords =
        await FileHelper.loadJson<AnswerSynthesisComparisonRecord[]>(
          recordsPath,
        );
      expect(firstRunRecords).toHaveLength(4);

      // Verify progress file has all 4 entries
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );
      const progressAfterFirstRun =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);
      expect(progressAfterFirstRun.entries).toHaveLength(4);

      // Run again - should load existing results instead of re-evaluating
      const result = await service.runIteration({
        iterationNumber: 1,
        testCases: allTestCases,
        config,
      });

      // Assert - should return same 4 records without re-evaluating
      expect(result).toHaveLength(4);

      const queryLogIds = result.map((r) => r.queryLogId).sort();
      expect(queryLogIds).toEqual(['ql-1', 'ql-2', 'ql-3', 'ql-4']);
    });

    it('should recalculate metrics based on complete record set', async () => {
      // Arrange
      const testSetName = 'test-set-metrics';
      const allTestCases = [
        createTestCase('ql-1'),
        createTestCase('ql-2'),
        createTestCase('ql-3'),
        createTestCase('ql-4'),
        createTestCase('ql-5'),
      ];
      const config = createConfig(testSetName);

      // First run: all pass
      await service.runIteration({
        iterationNumber: 1,
        testCases: allTestCases,
        config,
      });

      // Reset mock for second run with different scores
      let secondRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(() => {
        secondRunCount++;
        // One fail, rest pass
        const score = secondRunCount === 1 ? 3 : 5;
        return Promise.resolve({
          verdict: {
            faithfulness: { score: score, reasoning: 'Varied' },
            completeness: { score: 4, reasoning: 'Good' },
          },
          tokenUsage: [
            { model: 'gpt-4o-mini', inputTokens: 100, outputTokens: 50 },
          ],
        });
      });

      // Run again - should load existing results (not use new mock)
      await service.runIteration({
        iterationNumber: 1,
        testCases: allTestCases,
        config,
      });

      // Assert - metrics should reflect original first run (all pass)
      const metricsPath = path.join(
        tempDir,
        testSetName,
        'metrics',
        'metrics-iteration-1.json',
      );
      const metrics =
        await FileHelper.loadJson<AnswerSynthesisMetricsFile>(metricsPath);

      expect(metrics.sampleCount).toBe(5);
      // All 5 passed from first run
      expect(metrics.overallPassRate.value).toBe(1);
      expect(metrics.overallPassRate.numerator).toBe(5);
      expect(metrics.overallPassRate.denominator).toBe(5);
    });
  });
});
