import { Test, TestingModule } from '@nestjs/testing';

import * as os from 'node:os';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import { AnswerSynthesisMetricsCalculator } from '../../../services/answer-synthesis-metrics-calculator.service';
import { AnswerSynthesisResultManagerService } from '../../../services/answer-synthesis-result-manager.service';
import type {
  AnswerSynthesisComparisonRecord,
  AnswerSynthesisMetricsFile,
} from '../../../types/answer-synthesis.types';

// Helper to create temp directory
const getTempDir = () =>
  path.join(os.tmpdir(), `answer-synthesis-test-${Date.now()}`);

describe('AnswerSynthesisResultManagerService Integration', () => {
  let service: AnswerSynthesisResultManagerService;
  // Unused but kept for test setup clarity
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let metricsCalculator: AnswerSynthesisMetricsCalculator;
  let tempDir: string;

  // Test data factories
  const createComparisonRecord = (
    overrides: Partial<AnswerSynthesisComparisonRecord> = {},
  ): AnswerSynthesisComparisonRecord => ({
    queryLogId: 'ql-123',
    question: 'What is OOP?',
    systemAnswer: 'CS201 teaches Object-Oriented Programming...',
    judgeVerdict: {
      faithfulness: {
        score: 5,
        reasoning: 'Fully supported',
      },
      completeness: {
        score: 4,
        reasoning: 'Good explanation',
      },
    },
    overallScore: 4.5,
    passed: true,
    courseCount: 2,
    tokenUsage: [
      {
        model: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
      },
    ],
    ...overrides,
  });

  beforeAll(() => {
    tempDir = getTempDir();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnswerSynthesisResultManagerService,
        AnswerSynthesisMetricsCalculator,
      ],
    })
      .overrideProvider(AnswerSynthesisResultManagerService)
      .useFactory({
        factory: (metricsCalc) => {
          return new AnswerSynthesisResultManagerService(metricsCalc, tempDir);
        },
        inject: [AnswerSynthesisMetricsCalculator],
      })
      .compile();

    service = module.get<AnswerSynthesisResultManagerService>(
      AnswerSynthesisResultManagerService,
    );
    metricsCalculator = module.get<AnswerSynthesisMetricsCalculator>(
      AnswerSynthesisMetricsCalculator,
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
        'records',
        'metrics',
        'low-faithfulness',
        'cost',
        'final-metrics',
        'final-cost',
      ];

      for (const dir of expectedDirs) {
        const dirPath = path.join(tempDir, 'test-set-1', dir, '.gitkeep');
        const exists = FileHelper.exists(dirPath);
        expect(exists).toBe(true);
      }
    });
  });

  describe('saveIterationRecords', () => {
    it('should save records to file', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-set-1');
      const records = [createComparisonRecord()];

      // Act
      await service.saveIterationRecords({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        records,
      });

      // Assert
      const filePath = path.join(
        tempDir,
        'test-set-1',
        'records',
        'records-iteration-1.json',
      );
      const exists = FileHelper.exists(filePath);
      expect(exists).toBe(true);

      const savedRecords =
        await FileHelper.loadJson<AnswerSynthesisComparisonRecord[]>(filePath);
      expect(savedRecords).toHaveLength(1);
      expect(savedRecords[0].queryLogId).toBe('ql-123');
    });
  });

  describe('saveIterationMetrics', () => {
    it('should save metrics to file', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-set-1');
      const records = [createComparisonRecord()];

      // Act
      await service.saveIterationMetrics({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        metrics: service.calculateIterationMetrics({
          iterationNumber: 1,
          records,
          config: {
            judgeModel: 'gpt-4o-mini',
            judgeProvider: 'openai',
          },
        }),
      });

      // Assert
      const filePath = path.join(
        tempDir,
        'test-set-1',
        'metrics',
        'metrics-iteration-1.json',
      );
      const exists = FileHelper.exists(filePath);
      expect(exists).toBe(true);

      const metrics =
        await FileHelper.loadJson<AnswerSynthesisMetricsFile>(filePath);
      expect(metrics.iteration).toBe(1);
      expect(metrics.sampleCount).toBe(1);
    });
  });

  describe('saveIterationCost', () => {
    it('should save cost data to file', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-set-1');
      const records = [createComparisonRecord()];

      // Act
      await service.saveIterationCost({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        cost: service.calculateIterationCost({
          iterationNumber: 1,
          testSetName: 'test-set-1',
          records,
          config: {
            judgeModel: 'gpt-4o-mini',
            judgeProvider: 'openai',
          },
        }),
      });

      // Assert
      const filePath = path.join(
        tempDir,
        'test-set-1',
        'cost',
        'cost-iteration-1.json',
      );
      const exists = FileHelper.exists(filePath);
      expect(exists).toBe(true);

      const costData = await FileHelper.loadJson(filePath);
      expect(costData).toMatchObject({
        iteration: 1,
        samples: 1,
        judgeModel: 'gpt-4o-mini',
        judgeProvider: 'openai',
      });
    });
  });

  describe('saveLowFaithfulness', () => {
    it('should save low-faithfulness analysis to file', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-set-1');
      const lowFaithfulnessAnalysis = {
        totalLowQuality: 1,
        totalSamples: 2,
        lowQualityRate: 0.5,
        byFaithfulnessReason: {
          completelyFalse: {
            count: 1,
            percentage: 1.0,
            description: 'Score 1',
            examples: [],
          },
          mostlyFalse: {
            count: 0,
            percentage: 0,
            description: 'Score 2',
            examples: [],
          },
          mixed: {
            count: 0,
            percentage: 0,
            description: 'Score 3',
            examples: [],
          },
        },
        byCompletenessReason: {
          fail: {
            count: 0,
            percentage: 0,
            description: 'Score 1',
            examples: [],
          },
          weak: {
            count: 0,
            percentage: 0,
            description: 'Score 2',
            examples: [],
          },
          descriptiveOnly: {
            count: 0,
            percentage: 0,
            description: 'Score 3',
            examples: [],
          },
        },
        insights: {
          systemStrength: 'Test strength',
          systemWeakness: 'Test weakness',
          recommendation: 'Test recommendation',
        },
      };

      // Act
      await service.saveLowFaithfulness({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        lowFaithfulness: lowFaithfulnessAnalysis,
      });

      // Assert
      const filePath = path.join(
        tempDir,
        'test-set-1',
        'low-faithfulness',
        'low-faithfulness-iteration-1.json',
      );
      const exists = FileHelper.exists(filePath);
      expect(exists).toBe(true);

      const data = await FileHelper.loadJson(filePath);
      expect(data).toMatchObject({
        totalLowQuality: 1,
        totalSamples: 2,
      });
    });
  });

  describe('calculateIterationMetrics', () => {
    it('should calculate metrics from records', () => {
      // Arrange
      const records = [
        createComparisonRecord({
          judgeVerdict: {
            faithfulness: { score: 5, reasoning: 'Perfect' },
            completeness: { score: 4, reasoning: 'Good' },
          },
          overallScore: 4.5,
          passed: true,
        }),
        createComparisonRecord({
          judgeVerdict: {
            faithfulness: { score: 3, reasoning: 'Mixed' },
            completeness: { score: 2, reasoning: 'Weak' },
          },
          overallScore: 2.5,
          passed: false,
        }),
      ];

      // Act
      const metrics = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
        config: {
          judgeModel: 'gpt-4o-mini',
          judgeProvider: 'openai',
        },
      });

      // Assert
      expect(metrics.iteration).toBe(1);
      expect(metrics.sampleCount).toBe(2);
      expect(metrics.averageFaithfulnessScore.value).toBe(4); // (5+3)/2
      expect(metrics.averageCompletenessScore.value).toBe(3); // (4+2)/2
      expect(metrics.overallPassRate.value).toBe(0.5); // 1/2 passed
    });
  });

  describe('calculateFinalMetrics', () => {
    it('should aggregate metrics across iterations', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-set-2');

      // Save metrics for 2 iterations
      const records1 = [
        createComparisonRecord({
          judgeVerdict: {
            faithfulness: { score: 5, reasoning: '' },
            completeness: { score: 4, reasoning: '' },
          },
          overallScore: 4.5,
          passed: true,
        }),
      ];

      const records2 = [
        createComparisonRecord({
          judgeVerdict: {
            faithfulness: { score: 4, reasoning: '' },
            completeness: { score: 5, reasoning: '' },
          },
          overallScore: 4.5,
          passed: true,
        }),
      ];

      const metrics1 = service.calculateIterationMetrics({
        iterationNumber: 1,
        records: records1,
        config: { judgeModel: 'gpt-4o-mini', judgeProvider: 'openai' },
      });

      const metrics2 = service.calculateIterationMetrics({
        iterationNumber: 2,
        records: records2,
        config: { judgeModel: 'gpt-4o-mini', judgeProvider: 'openai' },
      });

      await service.saveIterationMetrics({
        testSetName: 'test-set-2',
        iterationNumber: 1,
        metrics: metrics1,
      });

      await service.saveIterationMetrics({
        testSetName: 'test-set-2',
        iterationNumber: 2,
        metrics: metrics2,
      });

      // Act
      const finalMetrics = service.calculateFinalMetrics({
        testSetName: 'test-set-2',
        totalIterations: 2,
        perIterationMetrics: [metrics1, metrics2],
      });

      // Assert
      expect(finalMetrics.iterations).toBe(2);
      expect(finalMetrics.aggregateMetrics.averageFaithfulnessScore.mean).toBe(
        4.5,
      );
      expect(finalMetrics.aggregateMetrics.averageCompletenessScore.mean).toBe(
        4.5,
      );
      expect(finalMetrics.perIterationMetrics).toHaveLength(2);
    });
  });

  describe('calculateFinalCost', () => {
    it('should aggregate costs across iterations', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-set-3');

      const records = [createComparisonRecord()];

      const cost1 = service.calculateIterationCost({
        iterationNumber: 1,
        testSetName: 'test-set-3',
        records,
        config: { judgeModel: 'gpt-4o-mini', judgeProvider: 'openai' },
      });

      const cost2 = service.calculateIterationCost({
        iterationNumber: 2,
        testSetName: 'test-set-3',
        records,
        config: { judgeModel: 'gpt-4o-mini', judgeProvider: 'openai' },
      });

      await service.saveIterationCost({
        testSetName: 'test-set-3',
        iterationNumber: 1,
        cost: cost1,
      });

      await service.saveIterationCost({
        testSetName: 'test-set-3',
        iterationNumber: 2,
        cost: cost2,
      });

      // Act
      const finalCost = service.calculateFinalCost({
        testSetName: 'test-set-3',
        totalIterations: 2,
        perIterationCosts: [cost1, cost2],
      });

      // Assert
      expect(finalCost.iterations).toBe(2);
      expect(finalCost.aggregateStats.totalSamples).toBe(2);
      expect(finalCost.perIterationCosts).toHaveLength(2);
    });
  });
});
