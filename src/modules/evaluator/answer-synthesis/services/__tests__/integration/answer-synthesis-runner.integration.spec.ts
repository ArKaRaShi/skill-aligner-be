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
        factory: (resultMgr, comparison, metrics, lowFaith) => {
          return new AnswerSynthesisRunnerService(
            mockJudgeEvaluator as any,
            comparison,
            metrics,
            lowFaith,
            resultMgr,
            tempDir, // Pass tempDir to runner service too
          );
        },
        inject: [
          AnswerSynthesisResultManagerService,
          AnswerSynthesisComparisonService,
          AnswerSynthesisMetricsCalculator,
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

  describe('Progress incremental saving (after each sample)', () => {
    it('should save progress after every sample', async () => {
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

      // Assert - verify progress was saved after each sample
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

  describe('Resume from partial progress (skip completed samples)', () => {
    it('should skip already completed samples when resuming', async () => {
      // Arrange
      const testSetName = 'test-set-resume';
      const allTestCases = [
        createTestCase('ql-1'),
        createTestCase('ql-2'),
        createTestCase('ql-3'),
      ];
      const config = createConfig(testSetName);

      // First run: complete 2 samples then "crash" on the 3rd
      let firstRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(() => {
        firstRunCount++;
        if (firstRunCount === 3) {
          // Simulate crash after 2 samples successfully completed
          throw new Error('Simulated crash');
        }
        return Promise.resolve(createJudgeResult(`ql-${firstRunCount}`));
      });

      // First iteration (will fail after 2 complete)
      await expect(
        service.runIteration({
          iterationNumber: 1,
          testCases: allTestCases,
          config,
        }),
      ).rejects.toThrow('Simulated crash');

      expect(firstRunCount).toBe(3);

      // Verify progress file shows 2 completed
      const progressPath = path.join(
        tempDir,
        testSetName,
        'iteration-1',
        '.progress.json',
      );
      const progressAfterCrash =
        await FileHelper.loadJson<AnswerSynthesisProgressFile>(progressPath);
      expect(progressAfterCrash.statistics.completedQuestions).toBe(2);

      // Note: records file does NOT exist because the run crashed before final save
      const recordsPath = path.join(
        tempDir,
        testSetName,
        'records',
        'records-iteration-1.json',
      );
      const recordsExist = FileHelper.exists(recordsPath);
      expect(recordsExist).toBe(false);

      // Reset mock for second run
      let secondRunCount = 0;
      (judgeEvaluator.evaluate as jest.Mock).mockImplementation(() => {
        secondRunCount++;
        return Promise.resolve(createJudgeResult(`ql-${secondRunCount + 2}`));
      });

      // Act - resume iteration (should skip the 2 completed samples)
      const result = await service.runIteration({
        iterationNumber: 1,
        testCases: allTestCases,
        config,
      });

      // Assert - should only evaluate 1 new sample (ql-3)
      // Without existing records, result only contains the new record
      expect(secondRunCount).toBe(1); // Only 1 new sample evaluated
      expect(result).toHaveLength(1); // Only new record (no existing records to restore)

      const queryLogIds = result.map((r) => r.queryLogId).sort();
      expect(queryLogIds).toEqual(['ql-3']);
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
