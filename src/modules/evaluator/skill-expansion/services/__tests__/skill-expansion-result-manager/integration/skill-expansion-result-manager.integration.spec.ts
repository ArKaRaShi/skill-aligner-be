import { Test, TestingModule } from '@nestjs/testing';

import * as os from 'node:os';
import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import type { SampleEvaluationRecord } from '../../../../types/skill-expansion.types';
import { SkillExpansionMetricsCalculator } from '../../../skill-expansion-metrics-calculator.service';
import { SkillExpansionResultManagerService } from '../../../skill-expansion-result-manager.service';

// Helper to create temp directory
const getTempDir = () =>
  path.join(os.tmpdir(), `skill-expansion-test-${Date.now()}`);

describe('SkillExpansionResultManagerService Integration', () => {
  let service: SkillExpansionResultManagerService;
  let tempDir: string;

  // Test data factories
  const createSampleRecord = (
    overrides: Partial<SampleEvaluationRecord> = {},
  ): SampleEvaluationRecord => ({
    queryLogId: 'ql-123',
    question: 'What is OOP?',
    comparison: {
      question: 'What is OOP?',
      skills: [
        {
          question: 'What is OOP?',
          systemSkill: 'Object-Oriented Programming',
          systemReason: 'User asked about OOP',
          judgeVerdict: 'PASS',
          judgeNote: 'Valid technical competency',
          agreementType: 'AGREE',
        },
      ],
      overall: {
        conceptPreserved: true,
        agreementCount: 1,
        disagreementCount: 0,
        totalSkills: 1,
      },
    },
    judgeResult: {
      result: {
        skills: [],
        overall: {
          conceptPreserved: true,
          summary: 'Good',
        },
      },
      tokenUsage: [
        {
          model: 'gpt-4o-mini',
          inputTokens: 100,
          outputTokens: 50,
        },
      ],
    },
    evaluatedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeAll(() => {
    tempDir = getTempDir();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillExpansionResultManagerService,
        SkillExpansionMetricsCalculator,
      ],
    })
      .overrideProvider(SkillExpansionResultManagerService)
      .useFactory({
        factory: (metricsCalc) => {
          return new SkillExpansionResultManagerService(metricsCalc, tempDir);
        },
        inject: [SkillExpansionMetricsCalculator],
      })
      .compile();

    service = module.get<SkillExpansionResultManagerService>(
      SkillExpansionResultManagerService,
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
        'metrics',
        'records',
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
      const records = [createSampleRecord()];

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
    });
  });

  describe('saveIterationMetrics', () => {
    it('should save metrics to file', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-set-1');
      const metrics = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        totalSkills: 10,
        passedSkills: 8,
        passRate: 0.8,
        totalQuestions: 5,
        conceptPreservedQuestions: 4,
        conceptPreservationRate: 0.8,
        agreedSkills: 8,
        totalEvaluatedSkills: 10,
        overallAgreementRate: 0.8,
        skillCountDistribution: { 2: 5 },
        truePositives: 8,
        falsePositives: 2,
      };

      // Act
      await service.saveIterationMetrics({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        metrics,
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
    });
  });

  describe('saveIterationCost', () => {
    it('should save cost data to file', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-set-1');
      const records = [createSampleRecord()];

      // Act
      await service.saveIterationCost({
        testSetName: 'test-set-1',
        iterationNumber: 1,
        config: {
          judgeModel: 'gpt-4o-mini',
          judgeProvider: 'openai',
        },
        records,
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
        sampleCount: 1,
        skillCount: 1,
        model: 'gpt-4o-mini',
        provider: 'openai',
      });
    });
  });

  describe('calculateIterationMetrics', () => {
    it('should calculate metrics from records', () => {
      // Arrange
      const records = [
        createSampleRecord({
          comparison: {
            question: 'Question 1',
            skills: [
              {
                question: 'Question 1',
                systemSkill: 'OOP',
                systemReason: 'Good',
                judgeVerdict: 'PASS',
                judgeNote: 'Valid technical competency',
                agreementType: 'AGREE',
              },
            ],
            overall: {
              conceptPreserved: true,
              agreementCount: 1,
              disagreementCount: 0,
              totalSkills: 1,
            },
          },
        }),
      ];

      // Act
      const metrics = service.calculateIterationMetrics({
        iterationNumber: 1,
        records,
      });

      // Assert
      expect(metrics.iteration).toBe(1);
      expect(metrics.totalSkills).toBe(1);
      expect(metrics.totalQuestions).toBe(1);
      expect(metrics).toHaveProperty('timestamp');
    });
  });

  describe('calculateFinalMetrics', () => {
    it('should aggregate metrics across iterations', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-set-2');

      // Save metrics for 2 iterations
      const metrics1 = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        totalSkills: 10,
        passedSkills: 8,
        passRate: 0.8,
        totalQuestions: 5,
        conceptPreservedQuestions: 4,
        conceptPreservationRate: 0.8,
        agreedSkills: 8,
        totalEvaluatedSkills: 10,
        overallAgreementRate: 0.8,
        skillCountDistribution: { 2: 5 },
        truePositives: 8,
        falsePositives: 2,
      };

      const metrics2 = {
        ...metrics1,
        iteration: 2,
        passRate: 0.85,
        passedSkills: 9,
      };

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
      const finalMetrics = await service.calculateFinalMetrics({
        testSetName: 'test-set-2',
        totalIterations: 2,
        totalSamples: 10,
        totalSkills: 20,
      });

      // Assert
      expect(finalMetrics.totalIterations).toBe(2);
      expect(finalMetrics.totalSamples).toBe(10);
      expect(finalMetrics.totalSkills).toBe(20);
      expect(finalMetrics.metrics.passRate).toBeCloseTo(0.825, 4); // (0.8 + 0.85) / 2
      expect(finalMetrics.metricsByIteration).toHaveLength(2);
    });
  });

  describe('calculateFinalCost', () => {
    it('should aggregate costs across iterations', async () => {
      // Arrange
      await service.ensureDirectoryStructure('test-set-3');

      await service.saveIterationCost({
        testSetName: 'test-set-3',
        iterationNumber: 1,
        config: { judgeModel: 'gpt-4o-mini', judgeProvider: 'openai' },
        records: [],
      });

      await service.saveIterationCost({
        testSetName: 'test-set-3',
        iterationNumber: 2,
        config: { judgeModel: 'gpt-4o-mini', judgeProvider: 'openai' },
        records: [],
      });

      // Act
      const finalCost = await service.calculateFinalCost({
        testSetName: 'test-set-3',
        totalIterations: 2,
      });

      // Assert
      expect(finalCost.totalIterations).toBe(2);
      expect(finalCost.totalSamples).toBe(0);
    });
  });
});
